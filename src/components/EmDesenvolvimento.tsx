import Icone from './Icone';

export function EmDesenvolvimento({ nome }: { nome: string }) {
  return (
    <div className="cartao cartao-vazio">
      <div className="vazio-icone">
        <Icone nome="tool" tamanho={36} />
      </div>
      <h2>{nome}</h2>
      <span className="badge badge-aviso">Em desenvolvimento</span>
      <p className="texto-suave">Esta tela ainda está sendo construída. Em breve estará disponível aqui.</p>
    </div>
  );
}
