import type { ReactNode } from 'react';

export function Badge({ tipo = 'neutro', children }: { tipo?: 'ok' | 'aviso' | 'erro' | 'neutro' | 'info'; children: ReactNode }) {
  return <span className={`badge badge-${tipo}`}>{children}</span>;
}
