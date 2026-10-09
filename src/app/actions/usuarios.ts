'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteSupabase } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/sessao';
import { mensagemAmigavel } from '@/lib/erros';
import { ehPerfil, STATUS_USUARIO, type StatusUsuario } from '@/lib/perfis';
import type { EstadoAcao } from '@/components/FormAcao';

/**
 * Altera status (aprovar/bloquear) e, somente Desenvolvedor, o perfil.
 * O banco também garante essas regras (triggers e RLS).
 */
export async function atualizarUsuario(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const sessao = await exigirPerfil(['desenvolvedor', 'gestor']);
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  const perfil = String(formData.get('perfil') ?? '');
  const nome = String(formData.get('nome') ?? '').trim();

  if (id === sessao.user.id && status && status !== sessao.perfil.status) {
    return { erro: 'Você não pode alterar o próprio status.' };
  }
  if (status && !(STATUS_USUARIO as readonly string[]).includes(status)) return { erro: 'Status inválido.' };

  const alteracoes: Record<string, string> = {};
  if (status) alteracoes.status = status as StatusUsuario;
  if (nome.length >= 3) alteracoes.nome = nome;
  if (perfil) {
    if (sessao.perfil.perfil !== 'desenvolvedor') return { erro: 'Somente desenvolvedores alteram o perfil.' };
    if (!ehPerfil(perfil)) return { erro: 'Perfil inválido.' };
    alteracoes.perfil = perfil;
  }
  if (Object.keys(alteracoes).length === 0) return { erro: 'Nada para alterar.' };

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase.from('perfis').update(alteracoes).eq('id', id).select('id');
  if (error) return { erro: mensagemAmigavel(error) };
  if (!data || data.length === 0) return { erro: 'Usuário não encontrado ou sem permissão para alterá-lo.' };

  revalidatePath('/admin/usuarios');
  revalidatePath(`/admin/usuarios/${id}`);
  return { sucesso: 'Dados do usuário salvos.' };
}

/**
 * Salva as exceções de acesso de um usuário.
 * Para cada tela, o valor do formulário é: "padrao" (remove a exceção),
 * "liberar" (permitido) ou "bloquear" (negado).
 */
export async function salvarPermissoesUsuario(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const sessao = await exigirPerfil(['desenvolvedor', 'gestor']);
  const usuarioId = String(formData.get('usuario_id') ?? '');

  const supabase = await criarClienteSupabase();
  const { data: alvo, error: erroAlvo } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('id', usuarioId)
    .maybeSingle();
  if (erroAlvo) return { erro: mensagemAmigavel(erroAlvo) };
  if (!alvo) return { erro: 'Usuário não encontrado.' };
  if (sessao.perfil.perfil === 'gestor' && alvo.perfil !== 'colaborador') {
    return { erro: 'Gestores só podem alterar o acesso de colaboradores.' };
  }

  const { data: telas, error: erroTelas } = await supabase.from('telas').select('id');
  if (erroTelas) return { erro: mensagemAmigavel(erroTelas) };

  const liberar: { usuario_id: string; tela_id: string; permitido: boolean }[] = [];
  const remover: string[] = [];
  for (const tela of telas ?? []) {
    const valor = String(formData.get(`tela_${tela.id}`) ?? 'padrao');
    if (valor === 'liberar') liberar.push({ usuario_id: usuarioId, tela_id: tela.id, permitido: true });
    else if (valor === 'bloquear') liberar.push({ usuario_id: usuarioId, tela_id: tela.id, permitido: false });
    else remover.push(tela.id);
  }

  if (remover.length > 0) {
    const { error } = await supabase
      .from('tela_acesso_usuario')
      .delete()
      .eq('usuario_id', usuarioId)
      .in('tela_id', remover);
    if (error) return { erro: mensagemAmigavel(error) };
  }
  if (liberar.length > 0) {
    const { error } = await supabase
      .from('tela_acesso_usuario')
      .upsert(liberar, { onConflict: 'usuario_id,tela_id' });
    if (error) return { erro: mensagemAmigavel(error) };
  }

  revalidatePath(`/admin/usuarios/${usuarioId}`);
  return { sucesso: 'Acessos atualizados. O menu do usuário muda na próxima vez que ele carregar o sistema.' };
}
