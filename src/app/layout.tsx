import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Athena FinHub', template: '%s · Athena FinHub' },
  description: 'Intranet da área financeira',
  applicationName: 'Athena FinHub',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Athena FinHub', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

// viewport-fit=cover: o app ocupa a tela toda e respeita o "notch" via env(safe-area-inset-*)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
