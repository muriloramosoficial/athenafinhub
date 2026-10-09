'use client';

/**
 * Formulário padrão do sistema.
 * Liga um formulário a uma Server Action, mostra erro/sucesso e desabilita
 * o botão enquanto salva. Use em qualquer tela nova:
 *
 *   <FormAcao acao={minhaAction}>
 *     <label className="campo">...</label>
 *     <BotaoEnviar>Salvar</BotaoEnviar>
 *   </FormAcao>
 */
import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

export type EstadoAcao = { erro?: string; sucesso?: string } | undefined;

export function FormAcao({
  acao,
  children,
  className,
}: {
  acao: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  children: ReactNode;
  className?: string;
}) {
  const [estado, formAction] = useActionState(acao, undefined);
  return (
    <form action={formAction} className={className ?? 'formulario'}>
      {children}
      {estado?.erro && <div className="alerta alerta-erro">{estado.erro}</div>}
      {estado?.sucesso && <div className="alerta alerta-ok">{estado.sucesso}</div>}
    </form>
  );
}

export function BotaoEnviar({
  children,
  variante = 'primario',
  pequeno = false,
}: {
  children: ReactNode;
  variante?: 'primario' | 'secundario' | 'perigo';
  pequeno?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn btn-${variante} ${pequeno ? 'btn-pequeno' : ''}`}
      disabled={pending}
    >
      {pending ? 'Salvando...' : children}
    </button>
  );
}
