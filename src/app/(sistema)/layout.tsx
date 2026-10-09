import { exigirSessaoAtiva, obterTelasPermitidas } from '@/lib/sessao';
import { criarClienteSupabase } from '@/lib/supabase/server';
import { ROTULO_PERFIL, podeGerenciarTelas, podeGerenciarUsuarios } from '@/lib/perfis';
import { telaDoItem, type ItemMenuComTela } from '@/lib/tipos';
import Sidebar, { type GrupoSidebar } from '@/components/Sidebar';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

/**
 * Casca do sistema: sidebar + topo + conteúdo.
 * O menu é montado a partir de `menu_itens`, mostrando SOMENTE os itens
 * cuja tela o usuário pode acessar (regra vinda do banco).
 */
export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  // Sessão, permissões e menu são buscados EM PARALELO (uma ida ao Supabase
  // em vez de três em sequência). Se o usuário não puder entrar, exigirSessaoAtiva redireciona.
  const supabase = await criarClienteSupabase();
  const [sessao, permitidas, resMenu] = await Promise.all([
    exigirSessaoAtiva(),
    obterTelasPermitidas(),
    supabase
      .from('menu_itens')
      .select('id, grupo, rotulo, icone, tela_id, ordem, ativo, telas(codigo, nome, status)')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('rotulo', { ascending: true }),
  ]);
  const { data: itens, error } = resMenu;

  if (error) throw new Error(`Erro ao carregar o menu: ${error.message}`);

  // Monta grupos na ordem em que aparecem (grupo nulo = sem título, no topo)
  const grupos: GrupoSidebar[] = [];
  for (const item of (itens ?? []) as ItemMenuComTela[]) {
    const tela = telaDoItem(item);
    if (!tela || !permitidas.has(tela.codigo)) continue;
    const titulo = item.grupo?.trim() || null;
    let grupo = grupos.find((g) => g.titulo === titulo);
    if (!grupo) {
      grupo = { titulo, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push({
      id: item.id,
      rotulo: item.rotulo,
      icone: item.icone,
      href: `/t/${tela.codigo}`,
    });
  }
  // Grupos sem título primeiro
  grupos.sort((a, b) => (a.titulo === null ? -1 : b.titulo === null ? 1 : 0));

  const perfil = sessao.perfil.perfil;
  const mostrarAdmin = podeGerenciarUsuarios(perfil);

  return (
    <div className="app">
      <Sidebar
        grupos={grupos}
        mostrarAdministracao={mostrarAdmin}
        mostrarGestaoUsuarios={podeGerenciarUsuarios(perfil)}
        mostrarGestaoTelas={podeGerenciarTelas(perfil)}
        usuario={{ nome: sessao.perfil.nome, perfil: ROTULO_PERFIL[perfil] }}
      />
      <div className="principal">
        <header className="topbar">
          <div className="topbar-ambiente">Intranet · Área Financeira</div>
          <div className="topbar-logo">
            <Logo />
          </div>
          <div className="topbar-usuario">
            <div className="topbar-usuario-texto">
              <strong>{sessao.perfil.nome}</strong>
              <span className="texto-suave">{ROTULO_PERFIL[perfil]}</span>
            </div>
            <span className="avatar" aria-hidden="true">{sessao.perfil.nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'}</span>
          </div>
        </header>
        <main className="conteudo">{children}</main>
      </div>
    </div>
  );
}
