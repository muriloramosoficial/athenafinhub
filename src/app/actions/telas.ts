'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { criarClienteSupabase } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/sessao';
import { mensagemAmigavel } from '@/lib/erros';
import { ehArea, validarCodigo } from '@/lib/codigo-tela';
import { ehPerfil, STATUS_TELA, type StatusTela } from '@/lib/perfis';
import type { EstadoAcao } from '@/components/FormAcao';

/** Cria a tela: cadastro + perfis padrão + tabela própria (tudo em uma transação no banco). */
export async function criarTela(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirPerfil(['desenvolvedor']);

  const area = String(formData.get('area') ?? '');
  const nome = String(formData.get('nome') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim();
  const codigo = String(formData.get('codigo') ?? '').trim().toLowerCase();
  // Desenvolvedor sempre acessa tudo; por isso só guardamos os outros perfis
  const perfis = formData.getAll('perfis').map(String).filter(ehPerfil).filter((p) => p !== 'desenvolvedor');

  if (!ehArea(area)) return { erro: 'Selecione uma área.' };
  if (nome.length < 2 || nome.length > 80) return { erro: 'O nome deve ter entre 2 e 80 caracteres.' };
  const erroCodigo = validarCodigo(codigo, area);
  if (erroCodigo) return { erro: erroCodigo };

  const supabase = await criarClienteSupabase();
  const { error } = await supabase.rpc('criar_tela', {
    p_codigo: codigo,
    p_nome: nome,
    p_descricao: descricao,
    p_area: area,
    p_perfis: perfis,
  });
  if (error) return { erro: mensagemAmigavel(error) };

  revalidatePath('/admin/telas');
  redirect(`/admin/telas/${codigo}?criada=1`);
}

/** Edita nome e descrição (o código não muda, pois é o nome da tabela). */
export async function atualizarTela(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirPerfil(['desenvolvedor']);
  const id = String(formData.get('id') ?? '');
  const nome = String(formData.get('nome') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim();
  if (nome.length < 2 || nome.length > 80) return { erro: 'O nome deve ter entre 2 e 80 caracteres.' };

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from('telas')
    .update({ nome, descricao: descricao || null })
    .eq('id', id)
    .select('codigo');
  if (error) return { erro: mensagemAmigavel(error) };
  revalidatePath(`/admin/telas/${data?.[0]?.codigo ?? ''}`);
  revalidatePath('/admin/telas');
  return { sucesso: 'Dados da tela atualizados.' };
}

export async function atualizarStatusTela(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirPerfil(['desenvolvedor']);
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!(STATUS_TELA as readonly string[]).includes(status)) return { erro: 'Status inválido.' };

  const supabase = await criarClienteSupabase();
  const { error } = await supabase.from('telas').update({ status: status as StatusTela }).eq('id', id);
  if (error) return { erro: mensagemAmigavel(error) };
  revalidatePath('/admin/telas');
  return { sucesso: 'Status atualizado.' };
}

/** Define quais perfis enxergam a tela por padrão (Gestor e/ou Colaborador). */
export async function atualizarPerfisTela(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirPerfil(['desenvolvedor']);
  const id = String(formData.get('id') ?? '');
  const perfis = formData.getAll('perfis').map(String).filter(ehPerfil).filter((p) => p !== 'desenvolvedor');

  const supabase = await criarClienteSupabase();
  const { error: erroDel } = await supabase.from('tela_acesso_perfil').delete().eq('tela_id', id);
  if (erroDel) return { erro: mensagemAmigavel(erroDel) };
  if (perfis.length > 0) {
    const { error: erroIns } = await supabase
      .from('tela_acesso_perfil')
      .insert(perfis.map((perfil) => ({ tela_id: id, perfil })));
    if (erroIns) return { erro: mensagemAmigavel(erroIns) };
  }
  revalidatePath('/admin/telas');
  return { sucesso: 'Perfis padrão atualizados.' };
}
