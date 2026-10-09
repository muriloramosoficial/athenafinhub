"""
Testes das regras de acesso do banco (RLS, permissões, criação de telas).

Como rodar (na raiz do repositório):
    pip install pgserver "psycopg[binary]"
    python supabase/testes/testar_regras_banco.py

O script sobe um PostgreSQL temporário, simula as partes do Supabase usadas
pelas migrations (schemas auth/storage, roles anon/authenticated e auth.uid()),
aplica todas as migrations em ordem e executa os cenários de permissão.
Não acessa nenhum projeto Supabase real.
"""
import glob
import os
import sys
import tempfile

import pgserver
import psycopg

MIGRATIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "migrations")
SHIM = """
do $$ begin
 if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create schema if not exists storage;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage to anon, authenticated;
grant all on all tables in schema public to postgres;
"""

srv = pgserver.get_server(tempfile.mkdtemp(prefix="athena_pg_"), cleanup_mode="stop")
conn = psycopg.connect(srv.get_uri(), autocommit=True)
cur = conn.cursor()
cur.execute(SHIM)
for arquivo in sorted(glob.glob(os.path.join(MIGRATIONS, "*.sql"))):
    try:
        cur.execute(open(arquivo, encoding="utf-8").read())
    except Exception as e:  # noqa: BLE001
        print("ERRO ao aplicar", os.path.basename(arquivo), "->", e)
        sys.exit(1)
print("Migrations aplicadas:", len(glob.glob(os.path.join(MIGRATIONS, "*.sql"))))

cur.execute("select 1")
results = []

def check(name, cond):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ")+name)

def as_user(uid):
    cur.execute("reset role")
    cur.execute("set role authenticated")
    cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(uid),))
def as_anon():
    cur.execute("reset role"); cur.execute("set role anon")
def as_postgres():
    cur.execute("reset role"); cur.execute("select set_config('request.jwt.claim.sub', '', false)")
def tryq(sql, params=None):
    try:
        cur.execute(sql, params); 
        return ('ok', cur.fetchall() if cur.description else None)
    except Exception as e:
        return ('err', str(e).strip().split('\n')[0])

as_postgres()
# cria usuários (trigger cria perfis)
ids = {}
for nome, email in [('dev','dev@emp.com'),('gest','gest@emp.com'),('colab','colab@emp.com'),('colab2','c2@emp.com'),('gest2','g2@emp.com')]:
    cur.execute("insert into auth.users (email, raw_user_meta_data) values (%s, %s) returning id", (email, '{"nome": "%s"}' % nome))
    ids[nome] = cur.fetchone()[0]
cur.execute("select id, perfil, status, nome from public.perfis order by email")
print(cur.fetchall())
check("trigger cria perfil pendente como colaborador", tryq("select perfil,status from perfis where email='colab@emp.com'")[1]==[('colaborador','pendente')])

# bootstrap dev e gestor, via SQL editor
cur.execute("update perfis set perfil='desenvolvedor', status='ativo' where email='dev@emp.com'")
cur.execute("update perfis set perfil='gestor', status='ativo' where email='gest@emp.com'")
cur.execute("update perfis set status='ativo' where email='colab@emp.com'")
cur.execute("update perfis set status='ativo' where email='c2@emp.com'")
cur.execute("update perfis set perfil='gestor', status='ativo' where email='g2@emp.com'")

# Pendente não vê nada
as_postgres(); cur.execute("update perfis set status='pendente' where email='c2@emp.com'")
as_user(ids['colab2'])
check("pendente não vê telas", tryq("select * from telas_permitidas()")[1]==[])
check("pendente lê o próprio perfil", tryq("select status from perfis where id=auth.uid()")[1]==[('pendente',)] or tryq("select status from perfis")[1]==[('pendente',)])
st = tryq("update perfis set status='ativo' where id=auth.uid()")
check("pendente NÃO consegue auto-aprovar", st[0]=='err' and 'próprio status' in st[1])
as_postgres(); cur.execute("update perfis set status='ativo' where email='c2@emp.com'")
as_user(ids['colab2'])
st = tryq("select * from telas_permitidas()")
check("após aprovação colaborador vê Visão Geral", st[1]==[('gl_visao_geral',)])

# Dev cria tela
as_user(ids['dev'])
st = tryq("select criar_tela('tes_concbancaria','Conciliação Bancária','Conciliar extratos','tesouraria', array['colaborador','gestor'])")
check("dev cria tela tes_concbancaria", st[0]=='ok')
check("tabela tes_concbancaria existe", tryq("select count(*) from information_schema.tables where table_name='tes_concbancaria'")[1]==[(1,)])
check("RLS habilitado na tabela da tela", tryq("select relrowsecurity from pg_class where relname='tes_concbancaria'")[1]==[(True,)])
check("dev vê telas", len(tryq("select * from telas_permitidas()")[1])==2)

# Validações de código
check("código sem prefixo válido é recusado", tryq("select criar_tela('xyz_teste','Teste','', 'tesouraria', array['colaborador'])")[0]=='err')
check("prefixo x área incompatível é recusado", tryq("select criar_tela('bi_teste','Teste','', 'tesouraria', array['colaborador'])")[0]=='err')
check("código com espaço/maiúsculas é recusado (após normalização)", tryq("select criar_tela('tes_con banc','Teste','', 'tesouraria', array['colaborador'])")[0]=='err')
check("código duplicado é recusado", tryq("select criar_tela('tes_concbancaria','Outra','', 'tesouraria', array['colaborador'])")[0]=='err')
st = tryq("select criar_tela('TES_Pagto_Fornec','Pagamento Fornecedores','', 'tesouraria', array['gestor'])")
check("maiúsculas são normalizadas para minúsculas", st[0]=='ok' and tryq("select count(*) from information_schema.tables where table_name='tes_pagto_fornec'")[1]==[(1,)])
as_postgres(); cur.execute("create table gl_orfa (id int)")
as_user(ids['dev'])
check("tabela órfã com mesmo nome é recusada", tryq("select criar_tela('gl_orfa','Orfa','', 'global', array['gestor'])")[0]=='err')
as_postgres()
check("falha não deixa registro de tela parcial (rollback)", tryq("select count(*) from telas where codigo='gl_orfa'")[1]==[(0,)])
check("tabela órfã original preservada", tryq("select count(*) from information_schema.tables where table_name='gl_orfa'")[1]==[(1,)])
check("tentativa de SQL injection no código é recusada", tryq("select criar_tela('tes_x; drop table perfis;--','X','', 'tesouraria', array[]::text[])")[0]=='err')
check("tabela perfis continua existindo após injection", tryq("select count(*) from information_schema.tables where table_name='perfis'")[1]==[(1,)])

# Colaborador não cria tela
as_user(ids['colab'])
check("colaborador NÃO cria tela", tryq("select criar_tela('car_teste','Teste','', 'contas_receber', array['colaborador'])")[0]=='err')
check("colaborador NÃO insere em tela sem acesso (tes_pagto_fornec, só gestor)", tryq("insert into tes_pagto_fornec (dados) values ('{}')")[0]=='err')

# Gestor bloqueia tela para um colaborador específico
as_user(ids['gest'])
st = tryq("insert into tela_acesso_usuario (usuario_id, tela_id, permitido) select %s, id, false from telas where codigo='tes_concbancaria'", (ids['colab'],))
check("gestor bloqueia tela de colaborador (exceção)", st[0]=='ok')
as_user(ids['colab'])
check("colaborador bloqueado NÃO vê a tela", 'tes_concbancaria' not in [r[0] for r in tryq("select * from telas_permitidas()")[1]])
check("pode_acessar_tela retorna false para bloqueado", tryq("select pode_acessar_tela('tes_concbancaria')")[1]==[(False,)])
st = tryq("select count(*) from tes_concbancaria")
check("colaborador bloqueado não lê dados da tela (RLS)", st[0]=='ok' and st[1]==[(0,)])
st = tryq("insert into tes_concbancaria (dados) values ('{\"a\":1}')")
check("colaborador bloqueado não grava na tela (RLS)", st[0]=='err')

# Gestor libera tela para colaborador que não tinha
as_user(ids['gest'])
tryq("update tela_acesso_usuario set permitido = true where usuario_id=%s", (ids['colab'],))
as_user(ids['colab'])
st = tryq("insert into tes_concbancaria (dados) values ('{\"a\":1}') returning created_by")
check("liberado pelo gestor consegue gravar", st[0]=='ok' and st[1]==[(ids['colab'],)])
st = tryq("update tes_concbancaria set dados='{\"a\":2}' returning updated_by")
check("update grava updated_by", st[0]=='ok' and st[1]==[(ids['colab'],)])

# Gestor tenta promover colaborador
as_user(ids['gest'])
st = tryq("update perfis set perfil='gestor' where id=%s", (ids['colab'],))
check("gestor NÃO promove colaborador a gestor", st[0]=='err')
st = tryq("update perfis set status='bloqueado' where id=%s returning status", (ids['gest2'],))
check("gestor NÃO altera outro gestor (RLS, 0 linhas)", st[0]=='ok' and st[1]==[])
st = tryq("update perfis set status='ativo' where id=%s returning status", (ids['colab'],))
check("gestor aprova/altera colaborador", st[0]=='ok' and st[1]==[('ativo',)])
st = tryq("insert into telas (codigo,nome,area) values ('bi_x','X','bi')")
check("gestor NÃO insere telas diretamente", st[0]=='err')
st = tryq("insert into menu_itens (rotulo, tela_id) select 'x', id from telas where codigo='gl_visao_geral'")
check("gestor NÃO cria itens de menu", st[0]=='err')
st = tryq("select criar_tela('bi_gestor','X','', 'bi', array['gestor'])")
check("gestor NÃO cria tela via função", st[0]=='err')
st = tryq("insert into tela_acesso_perfil (tela_id, perfil) select id,'colaborador' from telas where codigo='gl_visao_geral' on conflict do nothing")
check("gestor NÃO altera padrão de perfil (insert bloqueado)", st[0]=='err')

# Dev gerencia menu e perfis
as_user(ids['dev'])
st = tryq("insert into menu_itens (grupo, rotulo, icone, tela_id, ordem) select 'Tesouraria','Conciliação Bancária','bank', id, 1 from telas where codigo='tes_concbancaria'")
check("dev cria item de menu", st[0]=='ok')
st = tryq("update perfis set perfil='gestor' where id=%s", (ids['colab2'],))
check("dev promove usuário", st[0]=='ok')
as_user(ids['colab2'])
check("promovido vê padrão de gestor (tes_concbancaria)", 'tes_concbancaria' in [r[0] for r in tryq("select * from telas_permitidas()")[1]])

# Tela inativa some para não-dev
as_user(ids['dev'])
tryq("update telas set status='inativa' where codigo='tes_pagto_fornec'")
as_user(ids['gest'])
check("tela inativa invisível para gestor", 'tes_pagto_fornec' not in [r[0] for r in tryq("select * from telas_permitidas()")[1]])
as_user(ids['dev'])
check("tela inativa visível para dev", 'tes_pagto_fornec' in [r[0] for r in tryq("select * from telas_permitidas()")[1]])

# Anônimo
as_anon()
check("anon NÃO executa telas_permitidas", tryq("select * from telas_permitidas()")[0]=='err')
check("anon NÃO lê perfis", tryq("select count(*) from perfis")[0]=='err')
check("anon NÃO executa criar_tela", tryq("select criar_tela('tes_zz','Z','', 'tesouraria', array[]::text[])")[0]=='err')

# Storage
as_postgres()
cur.execute("insert into storage.objects (bucket_id, name) values ('arquivos','tes_concbancaria/2026-10/extrato.pdf')")
as_user(ids['colab'])
print("storage check (RLS policies existem):", tryq("select count(*) from pg_policies where policyname like 'athena_arquivos%'")[1])
check("storage policies criadas", tryq("select count(*) from pg_policies where policyname like 'athena_arquivos%'")[1]==[(4,)])

as_postgres()
fails = [n for n,ok in results if not ok]
print(f"\n{len(results)-len(fails)}/{len(results)} passaram")
sys.exit(1 if fails else 0)
for f in fails: print("FALHOU:", f)
