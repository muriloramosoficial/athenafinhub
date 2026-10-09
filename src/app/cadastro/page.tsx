import { CadastroForm } from './CadastroForm';
import { Logo } from '@/components/Logo';

export default function PaginaCadastro() {
  return (
    <div className="pagina-central">
      <div className="cartao cartao-estreito">
        <Logo grande />
        <h1 className="titulo-centro">Criar cadastro</h1>
        <p className="texto-suave texto-centro">
          Após o cadastro, seu acesso precisa ser aprovado por um Gestor ou Desenvolvedor.
        </p>
        <CadastroForm />
        <p className="texto-suave texto-centro">
          Já tem cadastro? <a href="/login">Entrar</a>
        </p>
      </div>
    </div>
  );
}
