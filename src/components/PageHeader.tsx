import type { ReactNode } from 'react';

export function PageHeader({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p className="texto-suave">{subtitulo}</p>}
      </div>
      {acoes && <div className="page-acoes">{acoes}</div>}
    </div>
  );
}
