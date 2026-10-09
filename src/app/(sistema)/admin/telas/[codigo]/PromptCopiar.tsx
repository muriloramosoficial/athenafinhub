'use client';

import { useState } from 'react';

export function PromptCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="prompt-bloco">
      <div className="prompt-acoes">
        <button type="button" className="btn btn-primario btn-pequeno" onClick={copiar}>
          {copiado ? 'Copiado!' : 'Copiar ficha'}
        </button>
      </div>
      <textarea className="prompt-texto" readOnly value={texto} rows={18} />
    </div>
  );
}
