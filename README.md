# Athena FinHub

Intranet da área financeira (Tesouraria, Contas a Pagar, Contas a Receber e BI).

- **Frontend e servidor:** Next.js (App Router) + TypeScript, publicado no Cloudflare Workers (via OpenNext)
- **Backend, banco, autenticação e arquivos:** Supabase (Postgres + Auth + Storage)
- **Acesso:** restrito à rede da empresa via Cloudflare (ver [docs/PUBLICAR.md](docs/PUBLICAR.md))

## Documentação

| Documento | Para quê |
|---|---|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Como o sistema é organizado, perfis, permissões e banco |
| [docs/CRIAR_TELA.md](docs/CRIAR_TELA.md) | Passo a passo para criar uma nova tela (com ajuda de IA) |
| [docs/PUBLICAR.md](docs/PUBLICAR.md) | Supabase, Cloudflare (publicação e restrição por IP): do zero ao ar |

## Rodar localmente

Requisitos: Node.js 20+ e um projeto Supabase (veja [docs/PUBLICAR.md](docs/PUBLICAR.md), etapa 1).

```bash
npm install
cp .env.example .env.local     # preencha as chaves do Supabase
npm run dev                    # http://localhost:3000
```

Verificações:

```bash
npm run typecheck              # tipos TypeScript
npm run build                  # build de produção
pip install pgserver "psycopg[binary]" && python supabase/testes/testar_regras_banco.py   # regras de acesso do banco
```

## Estrutura resumida

```
supabase/migrations/   SQL do banco (rodar em ordem, uma única vez)
supabase/testes/       testes automáticos das regras de acesso
src/app/               rotas (páginas) e Server Actions
src/app/(sistema)/     telas autenticadas: sidebar, /t/<codigo>, /admin/*
src/components/        componentes reutilizáveis (FormAcao, Sidebar, Icone...)
src/lib/               regras de negócio, sessão, permissões, validação de códigos
src/screens/           UMA pasta por tela (código = nome da pasta) + registry.ts
docs/                  documentação
```

## Regra de ouro

A segurança de verdade está no **banco** (RLS). A interface só esconde o que não pode ser usado.
Nunca use a `service_role` key no código do sistema.
