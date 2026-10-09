'use client';

import { useActionState } from 'react';
import { cadastrar } from '@/app/actions/auth';

export function CadastroForm() {
  const [estado, acao, pendente] = useActionState(cadastrar, undefined);
  return (
    <form action={acao} className="formulario">
      <label className="campo">
        <span>Nome completo</span>
        <input name="nome" required minLength={3} autoFocus />
      </label>
      <label className="campo">
        <span>E-mail corporativo</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="campo">
        <span>Senha (mín. 8 caracteres)</span>
        <input name="senha" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label className="campo">
        <span>Confirmar senha</span>
        <input name="confirmacao" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      {estado?.erro && <div className="alerta alerta-erro">{estado.erro}</div>}
      {estado?.sucesso && <div className="alerta alerta-ok">{estado.sucesso}</div>}
      <button className="btn btn-primario btn-bloco" disabled={pendente}>
        {pendente ? 'Enviando...' : 'Criar cadastro'}
      </button>
    </form>
  );
}
