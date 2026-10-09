/**
 * Perfis (papéis) de usuário e status.
 * Fonte da verdade no banco: tabela `perfis` (colunas `perfil` e `status`).
 * Se criar um novo perfil, altere também as constraints das migrations.
 */
export const PERFIS = ['desenvolvedor', 'gestor', 'colaborador'] as const;
export type Perfil = (typeof PERFIS)[number];

export const ROTULO_PERFIL: Record<Perfil, string> = {
  desenvolvedor: 'Desenvolvedor',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
};

export const STATUS_USUARIO = ['pendente', 'ativo', 'bloqueado'] as const;
export type StatusUsuario = (typeof STATUS_USUARIO)[number];

export const ROTULO_STATUS_USUARIO: Record<StatusUsuario, string> = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  bloqueado: 'Bloqueado',
};

export const STATUS_TELA = ['em_desenvolvimento', 'ativa', 'inativa'] as const;
export type StatusTela = (typeof STATUS_TELA)[number];

export const ROTULO_STATUS_TELA: Record<StatusTela, string> = {
  em_desenvolvimento: 'Em desenvolvimento',
  ativa: 'Ativa',
  inativa: 'Inativa',
};

export function ehPerfil(valor: unknown): valor is Perfil {
  return typeof valor === 'string' && (PERFIS as readonly string[]).includes(valor);
}

/** Desenvolvedor e Gestor podem administrar acessos de usuários. */
export function podeGerenciarUsuarios(perfil: Perfil): boolean {
  return perfil === 'desenvolvedor' || perfil === 'gestor';
}

/** Somente Desenvolvedor cria telas, menus e altera perfis padrão. */
export function podeGerenciarTelas(perfil: Perfil): boolean {
  return perfil === 'desenvolvedor';
}
