import { rotuloArea } from './codigo-tela';

/**
 * Gera o texto-padrão que você cola em uma IA para desenvolver a tela.
 * Ele já traz o código, a tabela, as regras do projeto e o contexto técnico.
 */
export function gerarPromptTela(tela: {
  codigo: string;
  nome: string;
  descricao: string | null;
  area: string;
}): string {
  return `Você vai desenvolver a tela "${tela.nome}" do sistema Athena FinHub (Next.js + Supabase).

## Identificação
- Código da tela: ${tela.codigo}
- Área: ${rotuloArea(tela.area)}
- Descrição: ${tela.descricao?.trim() || '(sem descrição cadastrada)'}
- Tabela de dados: public.${tela.codigo} (já criada, com RLS ligado)
  Colunas base: id (uuid), created_at, created_by, updated_at, updated_by, dados (jsonb)

## Regras obrigatórias do projeto
1. Crie os arquivos em src/screens/${tela.codigo}/ com um index.tsx que exporta um componente padrão
   (Server Component) que recebe { tela } (tipo PropsTela de src/screens/tipos.ts).
2. Registre o componente em src/screens/registry.ts usando a chave "${tela.codigo}".
3. Leia e grave dados SOMENTE pela tabela public.${tela.codigo}, usando criarClienteSupabase()
   de src/lib/supabase/server.ts. Nunca use a service_role key.
4. Se precisar de colunas próprias, crie uma NOVA migration em supabase/migrations/ (ex.: 0010_${tela.codigo}.sql)
   com ALTER TABLE public.${tela.codigo} ADD COLUMN ... Nunca edite migrations antigas.
   Para dados guardados em jsonb, prefira colunas reais quando o dado for usado em filtros ou relatórios.
5. Arquivos anexados: use o bucket "arquivos" (privado) com o caminho ${tela.codigo}/AAAA-MM/nome-do-arquivo.
   Limite de 10 MB por arquivo.
6. Não crie itens de menu e não altere permissões: isso é feito em Administração.
7. Use o padrão visual existente (classes de src/app/globals.css: cartao, tabela, btn, formulario, badge, alerta...)
   e o componente PageHeader para o título.
8. Use FormAcao/BotaoEnviar (src/components/FormAcao.tsx) para formulários que gravam dados,
   com Server Actions em um arquivo actions.ts dentro da pasta da tela.
9. Mensagens e textos da interface em português do Brasil.
10. Ao final, liste os arquivos criados/alterados, a migration (se houver) e como testar.

## O que a tela deve fazer
[Descreva aqui: campos, listagens, filtros, cálculos, relatórios, regras de negócio e o que deve acontecer em cada botão.]
`;
}
