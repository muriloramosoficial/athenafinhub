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
}

export default function Sidebar({ grupos, mostrarAdministracao, mostrarGestaoUsuarios, mostrarGestaoTelas }: Props) {
  const atual = usePathname();
  const ativo = (href: string) => atual === href || atual.startsWith(href + '/');

  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        <Logo />
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        {grupos.map((grupo, i) => (
          <div className="sidebar-grupo" key={grupo.titulo ?? `sem-grupo-${i}`}>
            {grupo.titulo && <div className="sidebar-titulo">{grupo.titulo}</div>}
            {grupo.itens.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-link ${ativo(item.href) ? 'ativo' : ''}`}
              >
                <Icone nome={item.icone} />
                <span>{item.rotulo}</span>
              </Link>
            ))}
          </div>
        ))}

        {mostrarAdministracao && (
          <div className="sidebar-grupo">
            <div className="sidebar-titulo">Administração</div>
            {mostrarGestaoUsuarios && (
              <Link href="/admin/usuarios" className={`sidebar-link ${ativo('/admin/usuarios') ? 'ativo' : ''}`}>
                <Icone nome="users" /> <span>Usuários e acessos</span>
              </Link>
            )}
            {mostrarGestaoTelas && (
              <>
                <Link href="/admin/telas" className={`sidebar-link ${ativo('/admin/telas') ? 'ativo' : ''}`}>
                  <Icone nome="layers" /> <span>Telas</span>
                </Link>
                <Link href="/admin/menus" className={`sidebar-link ${ativo('/admin/menus') ? 'ativo' : ''}`}>
                  <Icone nome="list" /> <span>Menus</span>
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      <form action={sair} className="sidebar-rodape">
        <button className="sidebar-link sidebar-sair">
          <Icone nome="logout" /> <span>Sair</span>
        </button>
      </form>
    </aside>
  );
}
