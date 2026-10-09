import type { MetadataRoute } from 'next';

// Manifesto do app instalável (“Adicionar à tela de início”).
// Gera /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Athena FinHub',
    short_name: 'Athena',
    description: 'Intranet da área financeira',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f6fb',
    theme_color: '#4b48e6',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
