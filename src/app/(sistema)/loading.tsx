/**
 * Estado de carregamento do sistema.
 * Aparece na hora ao trocar de tela, enquanto os dados do Supabase chegam,
 * para o usuário nunca ver a tela travada.
 */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="page-header" aria-hidden="true">
        <div style={{ width: '40%', maxWidth: 260 }}>
          <span className="esqueleto" style={{ display: 'block', height: 26, width: '100%' }} />
        </div>
      </div>
      <div className="cartao" aria-hidden="true">
        <span className="esqueleto" style={{ display: 'block', height: 14, width: '30%', marginBottom: 14 }} />
        <span className="esqueleto" style={{ display: 'block', height: 40, marginBottom: 8 }} />
        <span className="esqueleto" style={{ display: 'block', height: 40, marginBottom: 8 }} />
        <span className="esqueleto" style={{ display: 'block', height: 40 }} />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
