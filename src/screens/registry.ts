/**
 * REGISTRO DE TELAS
 * -----------------------------------------------------------------------------
 * Liga o CÓDIGO da tela (ex.: tes_conciliacao) ao componente que a desenha.
 *
 * Para adicionar uma tela nova:
 *   1. Crie a pasta src/screens/<codigo>/ com index.tsx (componente padrão).
 *   2. Importe aqui e adicione a linha no objeto abaixo.
 *   3. Em /admin/telas, mude o status para "Ativa" quando estiver pronta.
 * Veja o passo a passo completo em docs/CRIAR_TELA.md.
 */
import type { ComponentType } from 'react';
import type { PropsTela } from './tipos';

import GlVisaoGeral from './gl_visao_geral';

export const telasRegistradas: Record<string, ComponentType<PropsTela>> = {
  gl_visao_geral: GlVisaoGeral,
};
