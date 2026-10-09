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
