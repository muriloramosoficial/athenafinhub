'use server';

import { redirect } from 'next/navigation';
import { criarClienteSupabase } from '@/lib/supabase/server';
import { mensagemAmigavel } from '@/lib/erros';

export type EstadoFormulario = { erro?: string; sucesso?: string } | undefined;

export async function entrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const senha = String(formData.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Informe e-mail e senha.' };

  const supabase = await criarClienteSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: mensagemAmigavel(error) };

  redirect('/');
}

export async function cadastrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const nome = String(formData.get('nome') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const senha = String(formData.get('senha') ?? '');
  const confirmacao = String(formData.get('confirmacao') ?? '');

  if (nome.length < 3) return { erro: 'Informe seu nome completo.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: 'Informe um e-mail válido.' };
  if (senha.length < 8) return { erro: 'A senha precisa ter pelo menos 8 caracteres.' };
  if (senha !== confirmacao) return { erro: 'As senhas não conferem.' };

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) return { erro: mensagemAmigavel(error) };

  // Com a confirmação de e-mail ativa, não existe sessão ainda.
  if (!data.session) {
    return {
      sucesso:
        'Cadastro recebido. Se o Supabase pedir, confirme seu e-mail. Depois, um Gestor ou Desenvolvedor vai liberar seu acesso.',
    };
  }
  redirect('/sem-acesso?motivo=pendente');
}

export async function sair() {
  const supabase = await criarClienteSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}
