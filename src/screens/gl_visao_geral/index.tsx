import { PageHeader } from '@/components/PageHeader';
import { EmDesenvolvimento } from '@/components/EmDesenvolvimento';
import type { PropsTela } from '../tipos';

/**
 * Tela: Visão Geral (gl_visao_geral)
 * Status atual: EM DESENVOLVIMENTO.
 * Quando for construída, mude o status para "Ativa" em /admin/telas
 * e substitua o conteúdo abaixo.
 */
export default function VisaoGeral({ tela }: PropsTela) {
  return (
    <>
      <PageHeader titulo={tela.nome} subtitulo="Global" />
      <EmDesenvolvimento nome={tela.nome} />
    </>
  );
}
