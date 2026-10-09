'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from './Icone';
import { Logo } from './Logo';
import { sair } from '@/app/actions/auth';

export interface ItemSidebar {
  id: string;
  rotulo: string;
  icone: string;
  href: string;
}

export interface GrupoSidebar {
  titulo: string | null;
  itens: ItemSidebar[];
}

interface Props {
  grupos: GrupoSidebar[];
  mostrarAdministracao: boolean;
  mostrarGestaoUsuarios: boolean;
  mostrarGestaoTelas: boolean;
  usuario: { nome: string; perfil: string };
}

/** Quantos atalhos aparecem direto na barra do celular (o resto vai para "Mais"). */
const ATALHOS_NA_BARRA = 3;

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/**
 * Navegação do sistema em dois formatos (o CSS decide qual aparece):
 *  - Desktop: barra lateral fixa.
 *  - Celular: barra de abas inferior, com "Mais" abrindo uma folha
 *    (<details>, sem JavaScript extra).
 * Ambos mostram SOMENTE os itens que o usuário pode acessar.
 */
export default function Sidebar({
  grupos,
  mostrarAdministracao,
  mostrarGestaoUsuarios,
  mostrarGestaoTelas,
  usuario,
}: Props) {
  const atual = usePathname();
  const ativo = (href: string) => atual === href || atual.startsWith(href + '/');

  // Itens de administração entram como mais um grupo, com a mesma regra de exibição
  const itensAdmin: ItemSidebar[] = [];
  if (mostrarAdministracao) {
    if (mostrarGestaoUsuarios) itensAdmin.push({ id: 'adm-usuarios', rotulo: 'Usuários e acessos', icone: 'users', href: '/admin/usuarios' });
    if (mostrarGestaoTelas) {
      itensAdmin.push({ id: 'adm-telas', rotulo: 'Telas', icone: 'layers', href: '/admin/telas' });
      itensAdmin.push({ id: 'adm-menus', rotulo: 'Menus', icone: 'list', href: '/admin/menus' });
    }
  }

  const todos: ItemSidebar[] = [...grupos.flatMap((g) => g.itens), ...itensAdmin];
  const cabem = todos.length <= ATALHOS_NA_BARRA + 1;
  const naBarra = cabem ? todos : todos.slice(0, ATALHOS_NA_BARRA);
  const noMais = cabem ? [] : todos.slice(ATALHOS_NA_BARRA);
  const maisAtivo = noMais.some((i) => ativo(i.href));
  const nomeIniciais = iniciais(usuario.nome);

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <aside className="sidebar">
        <div className="sidebar-topo">
          <Logo />
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {grupos.map((grupo, i) => (
            <div className="sidebar-grupo" key={grupo.titulo ?? `sem-grupo-${i}`}>
              {grupo.titulo && <div className="sidebar-titulo">{grupo.titulo}</div>}
              {grupo.itens.map((item) => (
                <Link key={item.id} href={item.href} className={`sidebar-link ${ativo(item.href) ? 'ativo' : ''}`}>
                  <Icone nome={item.icone} />
                  <span>{item.rotulo}</span>
                </Link>
              ))}
            </div>
          ))}

          {itensAdmin.length > 0 && (
            <div className="sidebar-grupo">
              <div className="sidebar-titulo">Administração</div>
              {itensAdmin.map((item) => (
                <Link key={item.id} href={item.href} className={`sidebar-link ${ativo(item.href) ? 'ativo' : ''}`}>
                  <Icone nome={item.icone} />
                  <span>{item.rotulo}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-rodape">
          <div className="sidebar-usuario">
            <span className="avatar" aria-hidden="true">{nomeIniciais}</span>
            <div>
              <strong>{usuario.nome}</strong>
              <small>{usuario.perfil}</small>
            </div>
          </div>
          <form action={sair}>
            <button className="sidebar-link sidebar-sair" type="submit">
              <Icone nome="logout" /> <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- Celular: barra de abas ---------- */}
      <nav className="tabbar" aria-label="Menu principal">
        {naBarra.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`tabbar-item ${ativo(item.href) ? 'ativo' : ''}`}
            aria-current={ativo(item.href) ? 'page' : undefined}
          >
            <span className="tabbar-icone"><Icone nome={item.icone} /></span>
            <span>{item.rotulo}</span>
          </Link>
        ))}

        {noMais.length > 0 && (
          // key por rota: ao navegar, a folha fecha sozinha
          <details className={`tabbar-mais ${maisAtivo ? 'ativo' : ''}`} key={atual}>
            <summary className={`tabbar-item ${maisAtivo ? 'ativo' : ''}`}>
              <span className="tabbar-icone"><Icone nome="list" /></span>
              <span>Mais</span>
            </summary>
            <div className="tabbar-folha">
              {grupos.map((grupo, i) => (
                <div className="sidebar-grupo" key={grupo.titulo ?? `m-sem-grupo-${i}`}>
                  {grupo.titulo && <div className="sidebar-titulo">{grupo.titulo}</div>}
                  {grupo.itens.map((item) =>
                    noMais.some((n) => n.id === item.id) ? (
                      <Link key={item.id} href={item.href} className={`sidebar-link ${ativo(item.href) ? 'ativo' : ''}`}>
                        <Icone nome={item.icone} /> <span>{item.rotulo}</span>
                      </Link>
                    ) : null,
                  )}
                </div>
              ))}
              {itensAdmin.some((i) => noMais.some((n) => n.id === i.id)) && (
                <div className="sidebar-grupo">
                  <div className="sidebar-titulo">Administração</div>
                  {itensAdmin.map((item) =>
                    noMais.some((n) => n.id === item.id) ? (
                      <Link key={item.id} href={item.href} className={`sidebar-link ${ativo(item.href) ? 'ativo' : ''}`}>
                        <Icone nome={item.icone} /> <span>{item.rotulo}</span>
                      </Link>
                    ) : null,
                  )}
                </div>
              )}
              <form action={sair} className="sidebar-rodape">
                <button className="sidebar-link sidebar-sair" type="submit">
                  <Icone nome="logout" /> <span>Sair</span>
                </button>
              </form>
            </div>
          </details>
        )}
      </nav>
    </>
  );
}
