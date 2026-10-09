# Design system: Athena FinHub

Tudo visual está em `src/app/globals.css`. Para mudar a marca, edite os **tokens** em `:root`.

## Tokens principais
- Marca: `--brand-*`, `--gradiente-marca`, `--accent-500` (turquesa)
- Superfícies: `--fundo`, `--superficie`, `--superficie-2`, `--linha`
- Texto: `--texto`, `--texto-2`, `--texto-3`
- Semânticas: `--sucesso`, `--aviso`, `--erro`, `--info` (e suas versões `-fundo`)
- Forma e sombra: `--raio-*`, `--sombra*`
- Espaçamento: `--e1` … `--e10` (escala de 4px)
- Medidas de navegação: `--sidebar-largura`, `--topbar-altura`, `--tabbar-altura`

O modo escuro é automático (preferência do sistema) e reaproveita os mesmos tokens.

## Componentes (classes)
| Classe | Uso |
|---|---|
| `.cartao` | superfície de conteúdo |
| `.page-header` + `.page-acoes` | título da tela e botões de ação |
| `.btn` + `.btn-primario` / `.btn-secundario` / `.btn-perigo` / `.btn-fantasma` | botões (`.btn-pequeno`, `.btn-bloco`) |
| `.campo`, `.linha-campos`, `.formulario` | formulários |
| `.badge` + `.badge-ok` / `-aviso` / `-erro` / `-info` / `-neutro` | situação |
| `.alerta` + `.alerta-ok` / `-erro` / `-aviso` / `-info` | mensagens |
| `.tabela` | tabela (no celular vira lista de cartões) |
| `.avatar` | iniciais do usuário |
| `.cartao-vazio` | estado vazio |

### Tabelas no celular
Cada `<td>` precisa de `data-label="Nome da coluna"`. É o que aparece como rótulo quando a tabela vira cartões:

```tsx
<td data-label="Nome">{u.nome}</td>
```

## Celular (app nativo)
- Abaixo de 860px: a sidebar vira **barra de abas inferior**. Até 3 atalhos aparecem direto; o resto fica em **Mais** (folha inferior).
- Área segura do iPhone (notch) tratada com `env(safe-area-inset-*)`.
- Campos com 16px (o iOS não dá zoom ao focar) e alvos de toque de 44px+.
- Instalável na tela inicial via `manifest.ts` e `icon.svg`.

## Navegação
A lista de itens vem de `menu_itens` (filtrada pelas permissões). `src/components/Sidebar.tsx` monta as duas versões (desktop e celular) a partir da mesma lista.
