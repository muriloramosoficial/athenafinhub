/**
 * Ícones do sistema (SVG inline, sem dependências).
 * Para usar um novo ícone em um item de menu, adicione o nome aqui e no
 * seletor de ícones de /admin/menus (lista ICONES_DISPONIVEIS).
 */
import type { ReactNode } from 'react';

const CAMINHOS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  bank: (
    <>
      <path d="M3 10l9-6 9 6" />
      <path d="M4 10v9M9 10v9M15 10v9M20 10v9M3 21h18" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M16 13h2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  'arrow-down': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v10M8 13l4 4 4-4" />
    </>
  ),
  'arrow-up': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 17V7M8 11l4-4 4 4" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  layers: <path d="M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  sliders: <path d="M4 6h10M18 6h2M4 12h4M12 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
};

export const ICONES_DISPONIVEIS = Object.keys(CAMINHOS);

export default function Icone({ nome, tamanho = 18 }: { nome: string; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icone"
    >
      {CAMINHOS[nome] ?? CAMINHOS.folder}
    </svg>
  );
}
