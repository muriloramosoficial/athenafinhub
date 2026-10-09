'use client';

import { useActionState } from 'react';
import { entrar } from '@/app/actions/auth';

export function LoginForm() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form action={acao} className="formulario">
      <label className="campo">
        <span>E-mail corporativo</span>
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="campo">
        <span>Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      {estado?.erro && <div className="alerta alerta-erro">{estado.erro}</div>}
      <button className="btn btn-primario btn-bloco" disabled={pendente}>
        {pendente ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
