-- =============================================================================
-- ATHENA FINHUB - SETUP INICIAL DO BANCO (Supabase)
-- Gerado a partir de supabase/migrations/0001..0004 (nessa ordem).
-- Use em um projeto NOVO, uma única vez, no SQL Editor (New query > Run).
-- Para mudanças futuras, crie um novo arquivo em supabase/migrations/.
-- =============================================================================

-- ----- 0001_perfis_e_auth.sql -----
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

-- ----- 0002_telas_menus_permissoes.sql -----
-- =============================================================================
-- 0002 - TELAS, MENUS, PERMISSÕES E PROVISIONAMENTO DE TABELAS
-- -----------------------------------------------------------------------------
-- telas              : cadastro de cada tela. O `codigo` é o identificador oficial
--                      e também é o NOME da tabela de dados da tela.
--                      Padrão: gl_ (global), tes_ (tesouraria), cap_ (contas a pagar),
--                              car_ (contas a receber), bi_ (business intelligence)
-- menu_itens         : itens do sidebar; cada item abre UMA tela.
-- tela_acesso_perfil : quais telas cada perfil enxerga por padrão.
-- tela_acesso_usuario: exceções por usuário (liberar/bloquear) feitas por
--                      Gestor/Desenvolvedor. Sem registro = vale o padrão do perfil.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TELAS
-- -----------------------------------------------------------------------------
create table if not exists public.telas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique
              check (codigo ~ '^(gl|tes|cap|car|bi)_[a-z0-9]+(_[a-z0-9]+)*$'
                     and char_length(codigo) between 4 and 48),
  nome        text not null check (char_length(trim(nome)) between 2 and 80),
  descricao   text,
  area        text not null
              check (area in ('global', 'tesouraria', 'contas_pagar', 'contas_receber', 'bi')),
  status      text not null default 'em_desenvolvimento'
              check (status in ('em_desenvolvimento', 'ativa', 'inativa')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- O prefixo do código tem que corresponder à área escolhida
  constraint telas_codigo_area_ck check (
    split_part(codigo, '_', 1) = case area
      when 'global'          then 'gl'
      when 'tesouraria'      then 'tes'
      when 'contas_pagar'    then 'cap'
      when 'contas_receber'  then 'car'
      when 'bi'              then 'bi'
    end
  )
);

-- -----------------------------------------------------------------------------
-- MENU (sidebar)
-- -----------------------------------------------------------------------------
create table if not exists public.menu_itens (
  id          uuid primary key default gen_random_uuid(),
  grupo       text check (grupo is null or char_length(trim(grupo)) between 1 and 40),
  rotulo      text not null check (char_length(trim(rotulo)) between 1 and 40),
  icone       text not null default 'folder',
  tela_id     uuid not null references public.telas(id) on delete cascade,
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists menu_itens_ordem_idx on public.menu_itens (ordem);

-- -----------------------------------------------------------------------------
-- PERMISSÕES POR PERFIL (padrão)
-- -----------------------------------------------------------------------------
create table if not exists public.tela_acesso_perfil (
  tela_id  uuid not null references public.telas(id) on delete cascade,
  perfil   text not null check (perfil in ('desenvolvedor', 'gestor', 'colaborador')),
  primary key (tela_id, perfil)
);

-- -----------------------------------------------------------------------------
-- PERMISSÕES POR USUÁRIO (exceções)
-- -----------------------------------------------------------------------------
create table if not exists public.tela_acesso_usuario (
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  tela_id     uuid not null references public.telas(id) on delete cascade,
  permitido   boolean not null,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (usuario_id, tela_id)
);
create index if not exists tela_acesso_usuario_tela_idx on public.tela_acesso_usuario (tela_id);

-- -----------------------------------------------------------------------------
-- FUNÇÃO CENTRAL DE PERMISSÃO
-- Regra (nesta ordem):
--  1. Usuário precisa estar ATIVO.
--  2. Desenvolvedor acessa tudo.
--  3. Tela INATIVA não aparece para ninguém (exceto desenvolvedor).
--  4. Exceção do usuário (tela_acesso_usuario) vence o padrão do perfil.
--  5. Senão, vale o padrão do perfil (tela_acesso_perfil).
-- Esta é a ÚNICA fonte da verdade: usada pelo RLS das tabelas de cada tela,
-- pelo storage e pelo sidebar/telas do app.
-- -----------------------------------------------------------------------------
create or replace function public.pode_acessar_tela(p_codigo text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.telas t
    join public.perfis p on p.id = auth.uid() and p.status = 'ativo'
    where t.codigo = p_codigo
      and (
        p.perfil = 'desenvolvedor'
        or (
          t.status <> 'inativa'
          and coalesce(
            (select ua.permitido from public.tela_acesso_usuario ua
              where ua.usuario_id = p.id and ua.tela_id = t.id),
            exists (select 1 from public.tela_acesso_perfil tp
              where tp.tela_id = t.id and tp.perfil = p.perfil)
          )
        )
      )
  )
$$;

-- Lista de códigos de telas que o usuário logado pode acessar (usado pelo sidebar)
create or replace function public.telas_permitidas()
returns table (codigo text)
language sql stable security definer set search_path = public
as $$
  select t.codigo
  from public.telas t
  where public.pode_acessar_tela(t.codigo)
$$;

-- -----------------------------------------------------------------------------
-- PROVISIONAMENTO: cria a tabela de dados de uma tela, com RLS e permissões.
-- Chamada somente de dentro de criar_tela() (não exposta à API).
-- Toda tela nasce com o mesmo formato base:
--   id, created_at, created_by, updated_at, updated_by, dados (jsonb)
-- O Desenvolvedor/IA pode depois adicionar colunas específicas com ALTER TABLE
-- (ver docs/CRIAR_TELA.md).
-- -----------------------------------------------------------------------------
create or replace function public.tg_auditar_atualizacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.provisionar_tabela_tela(p_codigo text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if to_regclass('public.' || quote_ident(p_codigo)) is not null then
    raise exception 'Já existe uma tabela chamada %. Escolha outro código.', p_codigo;
  end if;

  execute format($f$
    create table public.%1$I (
      id          uuid primary key default gen_random_uuid(),
      created_at  timestamptz not null default now(),
      created_by  uuid references auth.users(id) on delete set null default auth.uid(),
      updated_at  timestamptz not null default now(),
      updated_by  uuid references auth.users(id) on delete set null,
      dados       jsonb not null default '{}'::jsonb
    )$f$, p_codigo);

  execute format('create index %I on public.%I (created_at)', p_codigo || '_created_at_idx', p_codigo);

  execute format('alter table public.%I enable row level security', p_codigo);

  execute format(
    'create policy %I on public.%I for select to authenticated using (public.pode_acessar_tela(%L))',
    p_codigo || '_sel', p_codigo, p_codigo);
  execute format(
    'create policy %I on public.%I for insert to authenticated with check (public.pode_acessar_tela(%L))',
    p_codigo || '_ins', p_codigo, p_codigo);
  execute format(
    'create policy %I on public.%I for update to authenticated using (public.pode_acessar_tela(%L)) with check (public.pode_acessar_tela(%L))',
    p_codigo || '_upd', p_codigo, p_codigo, p_codigo);
  execute format(
    'create policy %I on public.%I for delete to authenticated using (public.pode_acessar_tela(%L))',
    p_codigo || '_del', p_codigo, p_codigo);

  execute format(
    'create trigger %I before update on public.%I for each row execute function public.tg_auditar_atualizacao()',
    p_codigo || '_aud', p_codigo);

  execute format('revoke all on public.%I from anon, public', p_codigo);
  execute format('grant select, insert, update, delete on public.%I to authenticated', p_codigo);
end;
$$;

-- -----------------------------------------------------------------------------
-- CRIAR TELA (usado pela interface do sistema, somente Desenvolvedor)
-- Em uma única transação: cadastra a tela, define perfis padrão e cria a tabela.
-- Se qualquer etapa falhar (código inválido, tabela já existe...), nada é gravado.
-- -----------------------------------------------------------------------------
create or replace function public.criar_tela(
  p_codigo    text,
  p_nome      text,
  p_descricao text,
  p_area      text,
  p_perfis    text[]
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id     uuid;
  v_codigo text := lower(trim(p_codigo));
  v_perfil text;
begin
  if not public.eh_desenvolvedor() then
    raise exception 'Apenas desenvolvedores podem criar telas.' using errcode = '42501';
  end if;

  insert into public.telas (codigo, nome, descricao, area, created_by)
  values (v_codigo, trim(p_nome), nullif(trim(coalesce(p_descricao, '')), ''), p_area, auth.uid())
  returning id into v_id;

  foreach v_perfil in array coalesce(p_perfis, array[]::text[]) loop
    insert into public.tela_acesso_perfil (tela_id, perfil) values (v_id, v_perfil);
  end loop;

  perform public.provisionar_tabela_tela(v_codigo);

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists telas_updated_at on public.telas;
create trigger telas_updated_at before update on public.telas
  for each row execute function public.tg_atualizar_timestamp();

drop trigger if exists menu_itens_updated_at on public.menu_itens;
create trigger menu_itens_updated_at before update on public.menu_itens
  for each row execute function public.tg_atualizar_timestamp();

drop trigger if exists tela_acesso_usuario_updated_at on public.tela_acesso_usuario;
create trigger tela_acesso_usuario_updated_at before update on public.tela_acesso_usuario
  for each row execute function public.tg_atualizar_timestamp();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.telas               enable row level security;
alter table public.menu_itens          enable row level security;
alter table public.tela_acesso_perfil  enable row level security;
alter table public.tela_acesso_usuario enable row level security;

-- telas: todos os usuários ativos veem as telas ativas/em desenvolvimento; dev vê tudo
create policy telas_select on public.telas
  for select to authenticated
  using (public.eh_desenvolvedor()
         or (status <> 'inativa' and public.usuario_ativo_perfil() is not null));

create policy telas_insert on public.telas
  for insert to authenticated
  with check (public.eh_desenvolvedor());

create policy telas_update on public.telas
  for update to authenticated
  using (public.eh_desenvolvedor())
  with check (public.eh_desenvolvedor());

-- menu_itens: todos os usuários ativos leem (o sidebar filtra pelas telas permitidas)
create policy menu_itens_select on public.menu_itens
  for select to authenticated
  using (public.usuario_ativo_perfil() is not null);

create policy menu_itens_write on public.menu_itens
  for all to authenticated
  using (public.eh_desenvolvedor())
  with check (public.eh_desenvolvedor());

-- padrão por perfil: leem gestores/devs; só dev altera
create policy tela_acesso_perfil_select on public.tela_acesso_perfil
  for select to authenticated
  using (public.eh_gestor_ou_desenvolvedor());

create policy tela_acesso_perfil_write on public.tela_acesso_perfil
  for all to authenticated
  using (public.eh_desenvolvedor())
  with check (public.eh_desenvolvedor());

-- exceções por usuário: o próprio usuário lê as suas; gestor/dev leem;
-- dev altera qualquer um; gestor altera apenas COLABORADORES.
create policy tela_acesso_usuario_select on public.tela_acesso_usuario
  for select to authenticated
  using (usuario_id = auth.uid() or public.eh_gestor_ou_desenvolvedor());

create policy tela_acesso_usuario_write on public.tela_acesso_usuario
  for all to authenticated
  using (public.eh_desenvolvedor()
         or (public.eh_gestor() and public.perfil_de(usuario_id) = 'colaborador'))
  with check (public.eh_desenvolvedor()
         or (public.eh_gestor() and public.perfil_de(usuario_id) = 'colaborador'));

-- -----------------------------------------------------------------------------
-- GRANTS (o RLS acima é quem realmente filtra as linhas)
-- -----------------------------------------------------------------------------
revoke all on public.telas, public.menu_itens, public.tela_acesso_perfil,
              public.tela_acesso_usuario from anon, public;
grant select, insert, update          on public.telas               to authenticated;
grant select, insert, update, delete  on public.menu_itens          to authenticated;
grant select, insert, delete          on public.tela_acesso_perfil  to authenticated;
grant select, insert, update, delete  on public.tela_acesso_usuario to authenticated;

-- Funções expostas pela API: nunca para anônimos
revoke execute on function public.criar_tela(text, text, text, text, text[]) from public, anon;
revoke execute on function public.provisionar_tabela_tela(text) from public, anon, authenticated;
revoke execute on function public.pode_acessar_tela(text) from public, anon;
revoke execute on function public.telas_permitidas() from public, anon;
grant  execute on function public.criar_tela(text, text, text, text, text[]) to authenticated;
grant  execute on function public.pode_acessar_tela(text) to authenticated;
grant  execute on function public.telas_permitidas() to authenticated;
grant  execute on function public.perfil_de(uuid) to authenticated;
grant  execute on function public.eh_desenvolvedor() to authenticated;
grant  execute on function public.eh_gestor() to authenticated;
grant  execute on function public.eh_gestor_ou_desenvolvedor() to authenticated;
grant  execute on function public.usuario_ativo_perfil() to authenticated;

-- ----- 0003_storage.sql -----
-- =============================================================================
-- 0003 - ARMAZENAMENTO DE ARQUIVOS (Supabase Storage)
-- -----------------------------------------------------------------------------
-- Um único bucket PRIVADO ("arquivos") para não estourar o plano gratuito.
-- Convenção de caminho:  <codigo_da_tela>/<AAAA-MM>/<arquivo>
--   ex.: tes_conciliacao/2026-10/extrato_banco_x.pdf
-- O acesso ao arquivo segue a MESMA permissão da tela (pode_acessar_tela),
-- então quem não vê a tela também não baixa seus arquivos.
-- Limite: 10 MB por arquivo (ajuste em file_size_limit se precisar).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos', 'arquivos', false, 10485760)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit;

create policy athena_arquivos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

create policy athena_arquivos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

create policy athena_arquivos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

create policy athena_arquivos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

-- ----- 0004_tela_visao_geral.sql -----
-- =============================================================================
-- 0004 - TELA BASE: Visão Geral (global)
-- Cria a primeira tela do sistema, em "Em desenvolvimento", visível para todos
-- os perfis, com item no menu e sua tabela de dados (gl_visao_geral).
-- =============================================================================

insert into public.telas (codigo, nome, descricao, area, status)
values ('gl_visao_geral', 'Visão Geral', 'Painel inicial do Athena FinHub.', 'global', 'em_desenvolvimento')
on conflict (codigo) do nothing;

insert into public.tela_acesso_perfil (tela_id, perfil)
select t.id, p.perfil
from public.telas t
cross join (values ('desenvolvedor'), ('gestor'), ('colaborador')) as p(perfil)
where t.codigo = 'gl_visao_geral'
on conflict do nothing;

insert into public.menu_itens (grupo, rotulo, icone, tela_id, ordem)
select null, 'Visão Geral', 'home', t.id, 0
from public.telas t
where t.codigo = 'gl_visao_geral'
  and not exists (select 1 from public.menu_itens m where m.tela_id = t.id);

do $$
begin
  if to_regclass('public.gl_visao_geral') is null then
    perform public.provisionar_tabela_tela('gl_visao_geral');
  end if;
end;
$$;
