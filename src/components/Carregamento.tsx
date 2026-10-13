'use client';

/**
 * Feedback de carregamento do sistema.
 *  - Spinner: indicador pequeno, usado em botões e itens de menu.
 *  - ProgressoNavegacao: barra fina no topo enquanto a próxima tela carrega.
 *  - ItemLink: link com spinner próprio (mostra qual item foi clicado).
 *  - BotaoSair: botão de sair com estado de carregamento.
 */
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`spinner ${className}`} aria-hidden="true" />;
}

/** Barra fina no topo: aparece ao clicar em um link interno e some quando a nova tela chega. */
export function ProgressoNavegacao() {
  const pathname = usePathname();
  const [ativo, setAtivo] = useState(false);
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nova tela chegou: encerra a barra
  useEffect(() => {
    setAtivo(false);
    if (limite.current) clearTimeout(limite.current);
  }, [pathname]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const alvo = e.target instanceof Element ? e.target.closest('a') : null;
      if (!alvo || alvo.target === '_blank' || alvo.hasAttribute('download')) return;
      const url = new URL(alvo.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Mesmo endereço (ou só âncora): não há o que carregar
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setAtivo(true);
      // Segurança: se algo travar, a barra some sozinha
      if (limite.current) clearTimeout(limite.current);
      limite.current = setTimeout(() => setAtivo(false), 12000);
    }
    // fase de captura: roda ANTES do Link do Next cancelar o clique
    document.addEventListener('click', aoClicar, true);
    return () => {
      document.removeEventListener('click', aoClicar, true);
      if (limite.current) clearTimeout(limite.current);
    };
  }, []);

  return (
    <div className={`barra-progresso ${ativo ? 'ativa' : ''}`} aria-hidden="true">
      <span />
    </div>
  );
}

/** Indicador interno do link: só aparece enquanto ESTE link está carregando. */
function IndicadorLink({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {children}
      {pending && <Spinner className="spinner-item" />}
    </>
  );
}

/** Link com spinner próprio (usado no menu lateral e na barra inferior). */
export function ItemLink({ children, className = '', ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link className={className} {...rest}>
      <IndicadorLink>{children}</IndicadorLink>
    </Link>
  );
}

/** Botão de sair: mostra spinner enquanto a sessão é encerrada. */
export function BotaoSair({ className = 'sidebar-link sidebar-sair' }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? <Spinner /> : <IconeSair />}
      <span>{pending ? 'Saindo…' : 'Sair'}</span>
    </button>
  );
}

function IconeSair() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
