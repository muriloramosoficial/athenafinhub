import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware (roda antes de cada página):
 *  1. Bloqueia Hosts que não são o domínio oficial (APP_ALLOWED_HOSTS).
 *     Isso impede acesso por endereços que não são o domínio oficial (ex.: *.workers.dev).
 *  2. Renova a sessão do Supabase (cookies).
 *  3. Redireciona para /login quem não está autenticado.
 * A checagem de perfil/status e de permissão de cada tela é feita nas páginas
 * (src/lib/sessao.ts) e no próprio banco (RLS).
 */
const ROTAS_PUBLICAS = ['/login', '/cadastro'];

export async function middleware(request: NextRequest) {
  // 1) Host permitido
  const permitidos = (process.env.APP_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase().split(':')[0]) // ignora porta
    .filter(Boolean);
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const bloqueado =
    permitidos.length === 0
      ? process.env.NODE_ENV === 'production' // em produção, falha fechado
      : !permitidos.includes(host);
  if (bloqueado) {
    return new NextResponse('Acesso negado.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  // 2) Sessão
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // a página mostrará o erro de configuração

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.includes(caminho);

  // 3) Redirecionamentos
  if (!user && !publica) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && publica) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Ignora arquivos estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
