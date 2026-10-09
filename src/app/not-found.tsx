import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <div className="pagina-central">
      <div className="cartao cartao-estreito">
        <h1>Página não encontrada</h1>
        <p className="texto-suave">A tela que você procura não existe ou você não tem acesso a ela.</p>
        <Link className="btn btn-primario" href="/">Voltar ao início</Link>
      </div>
    </div>
  );
}
