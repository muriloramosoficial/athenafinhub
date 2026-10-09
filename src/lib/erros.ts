/** Traduz erros comuns do Supabase/Postgres em mensagens para o usuário. */
export function mensagemAmigavel(erro: { message: string; code?: string } | null | undefined): string {
  if (!erro) return 'Erro desconhecido.';
  const m = erro.message;
  if (m.includes('Invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (m.includes('User already registered')) return 'Já existe um cadastro com este e-mail.';
  if (m.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('telas_codigo_key') || (m.includes('duplicate key') && m.includes('codigo'))) {
    return 'Já existe uma tela com este código.';
  }
  if (m.includes('Já existe uma tabela')) return m;
  if (m.includes('Apenas desenvolvedores') || m.includes('Somente desenvolvedores')) return m;
  if (m.includes('Gestores só podem')) return m;
  if (m.includes('Você não pode')) return m;
  if (erro.code === '42501') return 'Você não tem permissão para esta ação.';
  if (erro.code === '23514') return 'Algum campo não atende às regras de validação. Confira os dados.';
  return `Não foi possível concluir a operação. Detalhe técnico: ${m}`;
}
