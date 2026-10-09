-- =============================================================================
-- 0001 - PERFIS DE USUÁRIO (ligados ao Supabase Auth)
-- -----------------------------------------------------------------------------
-- Cada usuário do Supabase Auth ganha automaticamente um registro em `perfis`.
--   perfil : desenvolvedor | gestor | colaborador
--   status : pendente (aguardando aprovação) | ativo | bloqueado
-- Novos cadastros entram como "colaborador" + "pendente" e só acessam o
-- sistema depois que um Gestor/Desenvolvedor aprovar.
-- =============================================================================

create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  nome        text not null,
  perfil      text not null default 'colaborador'
              check (perfil in ('desenvolvedor', 'gestor', 'colaborador')),
  status      text not null default 'pendente'
              check (status in ('pendente', 'ativo', 'bloqueado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Funções auxiliares de permissão.
-- SECURITY DEFINER evita recursão de RLS (as políticas usam estas funções,
-- e estas consultam `perfis`).
-- -----------------------------------------------------------------------------
create or replace function public.perfil_de(p_usuario uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select p.perfil from public.perfis p where p.id = p_usuario
$$;

-- Retorna o perfil do usuário logado somente se estiver ATIVO (senão null).
create or replace function public.usuario_ativo_perfil()
returns text
language sql stable security definer set search_path = public
as $$
  select p.perfil from public.perfis p where p.id = auth.uid() and p.status = 'ativo'
$$;

create or replace function public.eh_desenvolvedor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.usuario_ativo_perfil() = 'desenvolvedor', false)
$$;

create or replace function public.eh_gestor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.usuario_ativo_perfil() = 'gestor', false)
$$;

create or replace function public.eh_gestor_ou_desenvolvedor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.usuario_ativo_perfil() in ('gestor', 'desenvolvedor'), false)
$$;

-- -----------------------------------------------------------------------------
-- Criação automática do perfil quando alguém se cadastra.
-- O perfil enviado pelo usuário é IGNORADO: sempre entra como colaborador pendente.
-- -----------------------------------------------------------------------------
create or replace function public.tg_novo_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome, perfil, status)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
    'colaborador',
    'pendente'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_novo_usuario();

-- -----------------------------------------------------------------------------
-- Proteção de alterações em perfis (defesa extra além do RLS):
--  * Só Desenvolvedor altera o perfil (papel) de alguém.
--  * Ninguém altera o próprio status (evita auto-aprovação).
--  * Gestor só mexe em Colaboradores.
-- SQL Editor / service role (auth.uid() nulo) passa livre.
-- -----------------------------------------------------------------------------
create or replace function public.tg_perfis_protege()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.eh_desenvolvedor() then
    return new;
  end if;

  if new.perfil is distinct from old.perfil then
    raise exception 'Somente desenvolvedores podem alterar o perfil (papel) de um usuário.'
      using errcode = '42501';
  end if;

  if new.id = auth.uid() and new.status is distinct from old.status then
    raise exception 'Você não pode alterar o próprio status.' using errcode = '42501';
  end if;

  if new.id <> auth.uid() and old.perfil <> 'colaborador' then
    raise exception 'Gestores só podem alterar colaboradores.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists perfis_protege on public.perfis;
create trigger perfis_protege
  before update on public.perfis
  for each row execute function public.tg_perfis_protege();

-- Carimba updated_at automaticamente
create or replace function public.tg_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists perfis_updated_at on public.perfis;
create trigger perfis_updated_at
  before update on public.perfis
  for each row execute function public.tg_atualizar_timestamp();

-- -----------------------------------------------------------------------------
-- Segurança de acesso à tabela perfis
-- -----------------------------------------------------------------------------
alter table public.perfis enable row level security;

-- Vê o próprio perfil (mesmo pendente) e, se for gestor/dev, vê todos.
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.eh_gestor_ou_desenvolvedor());

-- Atualiza o próprio nome; dev altera qualquer um; gestor altera colaboradores.
-- (O trigger perfis_protege restringe ainda mais o que cada um pode mudar.)
create policy perfis_update on public.perfis
  for update to authenticated
  using (
    id = auth.uid()
    or public.eh_desenvolvedor()
    or (public.eh_gestor() and perfil = 'colaborador')
  )
  with check (
    id = auth.uid()
    or public.eh_desenvolvedor()
    or (public.eh_gestor() and perfil = 'colaborador')
  );

-- Não há INSERT/DELETE direto: inserção é feita pelo trigger do cadastro,
-- exclusão é feita pelo painel do Supabase (Auth > Users) se necessário.
revoke all on public.perfis from anon, public;
grant select, update on public.perfis to authenticated;
