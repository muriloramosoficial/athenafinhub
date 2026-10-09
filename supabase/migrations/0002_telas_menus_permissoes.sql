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
