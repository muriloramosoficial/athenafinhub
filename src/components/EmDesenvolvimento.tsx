import Icone from './Icone';

/**
 * Estado de tela em construção. Usado em todas as telas com status
 * "Em desenvolvimento". A prévia em blocos animados não mostra dados reais.
 */
export function EmDesenvolvimento({ nome }: { nome: string }) {
  return (
    <div className="cartao cartao-vazio em-desenvolvimento">
      <div className="vazio-icone">
        <Icone nome="tool" tamanho={28} />
      </div>
      <h2>{nome}</h2>
      <span className="badge badge-aviso">Em desenvolvimento</span>
      <p className="texto-suave">
        Esta tela ainda está sendo construída. Em breve estará disponível aqui.
      </p>
      <div className="esqueleto-grade" aria-hidden="true">
        <span className="esqueleto esqueleto-alto" />
        <span className="esqueleto" />
        <span className="esqueleto" />
      </div>
    </div>
  );
}
