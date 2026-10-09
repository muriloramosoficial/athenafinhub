import { LoginForm } from './LoginForm';
import { Logo } from '@/components/Logo';

export default function PaginaLogin() {
  return (
    <div className="pagina-central">
      <div className="cartao cartao-estreito">
        <Logo grande />
        <h1 className="titulo-centro">Entrar</h1>
        <LoginForm />
        <p className="texto-suave texto-centro">
          Ainda não tem acesso? <a href="/cadastro">Criar cadastro</a>
        </p>
      </div>
    </div>
  );
}
