# Arquitetura do Athena FinHub

## 1. Visão geral

```
 Navegador (dentro da rede da empresa)
        │  HTTPS  (Cloudflare: só o IP da empresa passa)
        ▼
 Vercel  ──  Next.js: páginas, menu dinâmico, formulários (Server Actions)
        │  cliente Supabase com a sessão do usuário (cookies)
        ▼
 Supabase
   ├─ Auth      : login / cadastro (e-mail + senha)
   ├─ Postgres  : perfis, telas, menus, permissões e UMA tabela por tela
   │             (protegidas por RLS: o banco recusa o que o usuário não pode)
   └─ Storage   : bucket privado "arquivos" (mesma permissão da tela)
```

Não há servidor próprio nem Edge Functions: menos peças = menos custo e menos manutenção.

## 2. Perfis (papéis)

| Perfil | Pode |
|---|---|
| **Desenvolvedor** | Tudo: cria telas e menus, cadastra/altera perfis, acessa todas as telas, configura qualquer usuário |
| **Gestor** | Aprova/bloqueia cadastros, configura o acesso de **colaboradores**, enxerga as telas do próprio perfil |
| **Colaborador** | Usa as telas liberadas para ele |

Fluxo de cadastro: a pessoa se cadastra → entra como **Colaborador pendente** → um Gestor/Desenvolvedor aprova →
ela passa a ver apenas as telas liberadas. Ninguém consegue aprovar a si mesmo (garantido pelo banco).

## 3. Como o acesso é decidido

Ordem de decisão (função `pode_acessar_tela` no banco):

1. Usuário precisa estar **ativo**.
2. **Desenvolvedor** acessa tudo.
3. Tela **inativa** não aparece para ninguém (exceto desenvolvedor).
4. Se existe uma **exceção** para o usuário (Liberar/Bloquear em *Usuários e acessos*), ela vence.
5. Senão, vale o **padrão do perfil** (em *Telas → perfis padrão*).

Essa mesma regra é usada pelo menu, pela rota de cada tela, pelo RLS das tabelas e pelo Storage.
Assim, mesmo que alguém force uma URL ou chame a API direto, o banco bloqueia.

## 4. Menu dinâmico

- O menu é a tabela `menu_itens`: cada item tem **rótulo, ícone, grupo, ordem** e **uma tela**.
- O sidebar mostra só os itens cuja tela o usuário pode acessar (`telas_permitidas()`).
- Itens sem grupo aparecem no topo; itens com grupo são agrupados (ex.: "Tesouraria").
- Quem gerencia: Desenvolvedor, em **Administração → Menus**.

## 5. Telas, códigos e tabelas

Cada tela tem um **código** no padrão `<prefixo>_<nome>`:

| Área | Prefixo | Exemplo |
|---|---|---|
| Global | `gl_` | `gl_visao_geral` |
| Tesouraria | `tes_` | `tes_conciliacao_bancaria` |
| Contas a Pagar | `cap_` | `cap_fornecedores` |
| Contas a Receber | `car_` | `car_inadimplencia` |
| Business Inteligência | `bi_` | `bi_fluxo_caixa` |

- O código é também o **nome da tabela** da tela no banco (`public.<codigo>`), criada automaticamente
  pela função `criar_tela`. Cada tela tem a sua, então uma tela não quebra as outras.
- Toda tabela de tela nasce com: `id`, `created_at`, `created_by`, `updated_at`, `updated_by` e `dados` (jsonb),
  com RLS já ligado às permissões da tela.
- Quando a tela precisar de colunas próprias, a IA cria uma migration com `ALTER TABLE` (veja [CRIAR_TELA.md](CRIAR_TELA.md)).

Status de uma tela: **Em desenvolvimento** (mostra aviso de construção) → **Ativa** (renderiza o código) → **Inativa** (oculta).

## 6. Código: onde cada coisa fica

| Quero... | Arquivo |
|---|---|
| Mudar cores, espaçamentos e estilos | `src/app/globals.css` |
| Adicionar um ícone ao menu | `src/components/Icone.tsx` |
| Registrar uma tela nova | `src/screens/registry.ts` |
| Criar a pasta/componente de uma tela | `src/screens/<codigo>/index.tsx` |
| Regras de perfil e status | `src/lib/perfis.ts` |
| Regras de código de tela | `src/lib/codigo-tela.ts` |
| Mensagens de erro do banco | `src/lib/erros.ts` |
| Quem está logado / permissões na página | `src/lib/sessao.ts` |
| Formulário padrão (erro, sucesso, botão) | `src/components/FormAcao.tsx` |
| Bloqueio de domínio e login (middleware) | `src/middleware.ts` |
| Estrutura do banco | `supabase/migrations/` |

Padrões que valem para qualquer tela nova:
- Páginas e leituras de dados são **Server Components** (`async`), usando `criarClienteSupabase()`.
- Gravações usam **Server Actions** (`'use server'`) e formulários com `FormAcao` + `BotaoEnviar`.
- Nunca confie só na interface: o banco é quem decide. Um formulário que grava dados sempre passa pelo RLS.

## 7. Banco de dados

Migrations (rodar em ordem, uma vez, num projeto novo):

| Arquivo | Conteúdo |
|---|---|
| `0001_perfis_e_auth.sql` | `perfis`, cadastro automático, proteção de alterações, funções de perfil |
| `0002_telas_menus_permissoes.sql` | `telas`, `menu_itens`, permissões, `pode_acessar_tela`, `criar_tela` |
| `0003_storage.sql` | bucket privado `arquivos` e suas políticas |
| `0004_tela_visao_geral.sql` | primeira tela: `gl_visao_geral` (Em desenvolvimento) |

Regras de alteração do banco:
- **Nunca edite uma migration antiga** depois de aplicada. Crie uma nova (`0005_...sql`, `0006_...sql`...).
- Mudanças de estrutura de uma tela: `ALTER TABLE public.<codigo> ADD COLUMN ...` em uma migration nova.
- Excluir tela: não há botão, de propósito (protege os dados). Use **Inativa**.

## 8. Plano gratuito: cuidados para ficar no free

- **Banco (500 MB no Free):** dados em `jsonb` são compactos; colunas reais só quando precisar filtrar/relatar.
  Índices só nas colunas usadas em filtros. Evite guardar arquivo no banco.
- **Arquivos (1 GB no Free):** limite de 10 MB por arquivo (`0003_storage.sql`). Guarde só o necessário,
  e apague o que não precisa mais. Prefira PDF/XLSX compactados.
- **Autenticação:** o Free tem limite de envio de e-mails. Por isso o cadastro usa aprovação manual
  (sem e-mail de boas-vindas). Veja a configuração em [PUBLICAR.md](PUBLICAR.md).
- **Projeto pausado por inatividade:** projetos Free podem ser pausados após período sem uso.
  Se acontecer, basta restaurar no painel do Supabase.
- **Sem Edge Functions e sem Realtime:** nada é cobrado por execução extra; o app carrega sob demanda.
- **Menu e permissões** são consultados uma vez por página (sem polling).

## 9. Segurança (camadas)

1. **Cloudflare:** só o IP da empresa acessa o domínio (ver PUBLICAR.md).
2. **Middleware:** recusa qualquer `Host` que não esteja em `APP_ALLOWED_HOSTS` (bloqueia `*.vercel.app`).
3. **Autenticação:** login obrigatório; usuário precisa estar **ativo**.
4. **Permissões por tela:** verificadas na página e, principalmente, no **RLS** do banco.
5. **Proteção de perfis:** triggers impedem auto-aprovação, promoção por gestor e alteração de gestor por gestor.
6. **Cabeçalhos HTTP:** `X-Frame-Options: DENY`, `nosniff`, `noindex`.

Limites que você precisa conhecer:
- O **Supabase (API) continua acessível pela internet** (é preciso a URL e a chave pública, que ficam no app).
  A proteção dos dados é o login + RLS. Restrição de rede do próprio Supabase costuma ser recurso de plano pago.
- O bloqueio por IP fica no Cloudflare; o app só reforça o domínio.

## 10. Rodar os testes de permissão

```bash
pip install pgserver "psycopg[binary]"
python supabase/testes/testar_regras_banco.py
```

Ele cria um banco temporário e roda os cenários (perfis, bloqueios, auto-aprovação, validação de código,
tentativa de SQL injection, rollback e Storage). **Rode sempre que mexer em uma migration.**
