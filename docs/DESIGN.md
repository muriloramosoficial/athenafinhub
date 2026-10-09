# Design system: Athena FinHub

Tudo visual está em `src/app/globals.css`. Para mudar a marca, edite os **tokens** em `:root`.

## Tokens principais
- Destaque (azul): `--azul-300` … `--azul-700`, `--azul-suave`
- Superfícies: `--fundo`, `--superficie`, `--superficie-2`, `--superficie-3`, `--entrada`, `--linha`
- Texto: `--texto`, `--texto-2`, `--texto-3`
- Situação: `--sucesso`, `--aviso`, `--erro`, `--info` (usados só para status, não para destaque)
- Forma e sombra: `--raio-*`, `--sombra*`, `--anel` (foco)
- Espaçamento: `--e1` … `--e10` (escala de 4px)
- Medidas: `--sidebar-largura`, `--topbar-altura`, `--tabbar-altura`

O padrão é **escuro** (estilo painel de dados). Com o sistema em tema claro, a versão clara
é aplicada automaticamente pelos mesmos tokens.

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
| `.esqueleto-grade` + `.esqueleto` | prévia de tela em construção |
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
