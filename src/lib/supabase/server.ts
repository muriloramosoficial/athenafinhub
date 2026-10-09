import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Lê as variáveis do Supabase e avisa claramente se faltarem. */
export function lerVariaveisSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja o arquivo .env.example).',
    );
  }
  return { url, key };
}

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies) e, portanto, respeita o RLS.
 */
export async function criarClienteSupabase() {
  const { url, key } = lerVariaveisSupabase();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de Server Component (somente leitura de cookies).
          // O middleware renova a sessão, então pode ser ignorado com segurança.
        }
      },
    },
  });
}
