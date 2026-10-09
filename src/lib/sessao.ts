import { cache } from 'react';
import { redirect } from 'next/navigation';
import { criarClienteSupabase } from './supabase/server';
import type { Perfil } from './perfis';
import type { PerfilUsuario } from './tipos';

/**
 * Sessão do request atual: usuário autenticado + perfil na tabela `perfis`.
 * `cache` garante uma única ida ao banco por request, mesmo se chamada várias vezes.
 */
export const obterSessao = cache(async () => {
  const supabase = await criarClienteSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, email, nome, perfil, status, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) return null;
  return { supabase, user, perfil: perfil as PerfilUsuario };
});

/** Usuário do Supabase Auth (mesmo sem registro em `perfis`). */
export const obterUsuarioAutenticado = cache(async () => {
  const supabase = await criarClienteSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/** Exige login E usuário ativo. Caso contrário, redireciona. */
export async function exigirSessaoAtiva() {
  const sessao = await obterSessao();
  if (!sessao) {
    // Logado no Auth mas sem registro em `perfis` -> tela de aviso (evita loop de redirect)
    const usuario = await obterUsuarioAutenticado();
    redirect(usuario ? '/sem-acesso?motivo=sem_perfil' : '/login');
  }
  if (sessao.perfil.status !== 'ativo') redirect(`/sem-acesso?motivo=${sessao.perfil.status}`);
  return sessao;
}

/** Exige que o usuário tenha um dos perfis informados. */
export async function exigirPerfil(perfis: Perfil[]) {
  const sessao = await exigirSessaoAtiva();
  if (!perfis.includes(sessao.perfil.perfil)) redirect('/sem-acesso?motivo=sem_permissao');
  return sessao;
}

/**
 * Códigos das telas que o usuário logado pode acessar.
 * A regra fica no banco (função telas_permitidas), para existir uma única fonte da verdade.
 */
export const obterTelasPermitidas = cache(async (): Promise<Set<string>> => {
  // Não depende de obterSessao(): a função do banco já exige usuário ativo
  // (pode_acessar_tela checa perfis.status). Assim roda em paralelo com o perfil.
  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase.rpc('telas_permitidas');
  if (error) throw new Error(`Não foi possível carregar as permissões: ${error.message}`);
  return new Set((data as { codigo: string }[]).map((r) => r.codigo));
});
