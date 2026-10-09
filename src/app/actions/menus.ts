'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteSupabase } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/sessao';
import { mensagemAmigavel } from '@/lib/erros';
import { ICONES_DISPONIVEIS } from '@/components/Icone';
import type { EstadoAcao } from '@/components/FormAcao';

export async function criarMenu(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirPerfil(['desenvolvedor']);

  const grupo = String(formData.get('grupo') ?? '').trim() || null;
  const rotulo = String(formData.get('rotulo') ?? '').trim();
  const icone = String(formData.get('icone') ?? 'folder');
  const telaId = String(formData.get('tela_id') ?? '');
  const ordem = Number.parseInt(String(formData.get('ordem') ?? '0'), 10);

  if (rotulo.length < 1 || rotulo.length > 40) return { erro: 'O rótulo deve ter de 1 a 40 caracteres.' };
  if (!telaId) return { erro: 'Escolha a tela que este item vai abrir.' };
  if (!ICONES_DISPONIVEIS.includes(icone)) return { erro: 'Ícone inválido.' };
  if (Number.isNaN(ordem)) return { erro: 'A ordem deve ser um número.' };

  const supabase = await criarClienteSupabase();
  const { error } = await supabase.from('menu_itens').insert({
    grupo,
    rotulo,
    icone,
    tela_id: telaId,
    ordem,
    ativo: true,
  });
  if (error) return { erro: mensagemAmigavel(error) };

  revalidatePath('/admin/menus');
  revalidatePath('/', 'layout');
  return { sucesso: `Item "${rotulo}" criado no menu.` };
}

export async function alternarMenu(formData: FormData) {
  await exigirPerfil(['desenvolvedor']);
  const id = String(formData.get('id') ?? '');
  const ativo = String(formData.get('ativo')) === 'true';
  const supabase = await criarClienteSupabase();
  await supabase.from('menu_itens').update({ ativo }).eq('id', id);
  revalidatePath('/admin/menus');
  revalidatePath('/', 'layout');
}

export async function excluirMenu(formData: FormData) {
  await exigirPerfil(['desenvolvedor']);
  const id = String(formData.get('id') ?? '');
  const supabase = await criarClienteSupabase();
  await supabase.from('menu_itens').delete().eq('id', id);
  revalidatePath('/admin/menus');
  revalidatePath('/', 'layout');
}
