# Como criar uma nova tela

Fluxo recomendado: **você cria a tela no sistema → gera a ficha → a IA desenvolve → você ativa.**

## Passo 1 — Cadastrar a tela (Desenvolvedor)

1. Entre em **Administração → Telas → Nova tela**.
2. Escolha a **área** (Global, Tesouraria, Contas a Pagar, Contas a Receber, BI).
3. Digite o **nome** (ex.: `Conciliação Bancária`). O **código** é sugerido automaticamente:
   `tes_conciliacao_bancaria`. Você pode ajustar, usando só minúsculas, números e `_`.
4. Marque quem enxerga a tela por padrão (Gestores e/ou Colaboradores). Desenvolvedores veem tudo.
5. Clique em **Criar tela**.

Ao criar, o sistema faz tudo em uma única operação:
- cadastra a tela (status **Em desenvolvimento**);
- cria a tabela `public.<codigo>` com RLS ligado;
- define os perfis padrão.

Se algo falhar (código inválido, tabela com o mesmo nome...), nada fica pela metade.

## Passo 2 — Gerar a ficha para a IA

Na tela de gerenciamento da tela (**Gerenciar**), a seção **Ficha para a IA** traz um texto pronto:
código, tabela, regras do projeto e um campo final para você descrever a tela.

Preencha o campo **"O que a tela deve fazer"** com o detalhe funcional: campos, listagens, filtros, cálculos,
regras de negócio e o que cada botão faz. Quanto mais claro, melhor o resultado. Depois, **Copiar ficha** e envie
para a IA no seu projeto.

## Passo 3 — A IA desenvolve (o que ela deve produzir)

A ficha manda a IA seguir estes passos:

1. Criar `src/screens/<codigo>/index.tsx` (componente padrão recebendo `{ tela }`).
2. Registrar em `src/screens/registry.ts`:
   ```ts
   import TesConciliacaoBancaria from './tes_conciliacao_bancaria';
   export const telasRegistradas = {
     gl_visao_geral: GlVisaoGeral,
     tes_conciliacao_bancaria: TesConciliacaoBancaria, // <- nova linha
   };
   ```
3. Se precisar de colunas próprias: criar uma **nova migration** em `supabase/migrations/`, por exemplo:
   ```sql
   -- 0010_tes_conciliacao_bancaria.sql
   alter table public.tes_conciliacao_bancaria
     add column valor numeric(18,2) not null default 0,
     add column data_movimento date,
     add column conciliado boolean not null default false;
   create index on public.tes_conciliacao_bancaria (data_movimento);
   ```
   Ela deve ser aplicada no SQL Editor do Supabase (ver [PUBLICAR.md](PUBLICAR.md)).
4. Anexos vão para o bucket `arquivos`, no caminho `<codigo>/AAAA-MM/arquivo.ext`.

## Passo 4 — Revisar e ativar

1. Rode `npm run typecheck` e `npm run build`.
2. Faça o deploy (a Vercel publica ao enviar o código para o GitHub).
3. Em **Administração → Telas → Gerenciar**, mude o status para **Ativa**.
4. Em **Administração → Menus**, crie o item que abre a tela (grupo, rótulo, ícone, ordem).
5. Em **Administração → Usuários**, ajuste exceções, se houver.

## Regras para a tela ficar consistente

- Escreva o que é visível para o usuário em **português do Brasil**.
- Use `PageHeader` para o título e as classes de `globals.css` (`cartao`, `tabela-wrap`, `tabela`, `btn`, `alerta`...).
- Formulários de gravação: `FormAcao` + `BotaoEnviar` (veja `src/app/(sistema)/admin/telas/NovaTelaForm.tsx` como exemplo).
- Valide os dados no servidor (Server Action), não só no navegador.
- **Não** use a chave `service_role`. Sempre use `criarClienteSupabase()`.
- **Não** edite migrations antigas. Crie uma nova.
- Para remover uma tela, marque como **Inativa**. Não existe exclusão, de propósito.

## Dicas para quem está começando

- Para entender a estrutura, leia `src/screens/gl_visao_geral/index.tsx` (é o modelo mais simples).
- Para entender um formulário com gravação, leia `src/app/actions/telas.ts` e `src/components/FormAcao.tsx`.
- Para um novo ícone de menu: adicione o desenho em `src/components/Icone.tsx`; ele aparece automaticamente na lista.
