import { notFound } from 'next/navigation';
import { exigirSessaoAtiva, obterTelasPermitidas } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';
import { EmDesenvolvimento } from '@/components/EmDesenvolvimento';
import { telasRegistradas } from '@/screens/registry';
import { rotuloArea } from '@/lib/codigo-tela';
import { ROTULO_STATUS_TELA, type StatusTela } from '@/lib/perfis';
import type { Tela } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

/**
 * Rota genérica de TODAS as telas: /t/<codigo>
 *  - Confere a permissão (banco).
 *  - Se a tela está "Em desenvolvimento", mostra o aviso.
 *  - Senão, renderiza o componente registrado em src/screens/registry.ts.
 */
export default async function PaginaTela({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[a-z0-9_]+$/.test(codigo)) notFound();

  const sessao = await exigirSessaoAtiva();
  const permitidas = await obterTelasPermitidas();
  if (!permitidas.has(codigo)) notFound();

  const { data } = await sessao.supabase
    .from('telas')
    .select('id, codigo, nome, descricao, area, status, created_at')
    .eq('codigo', codigo)
    .maybeSingle();
  if (!data) notFound();
  const tela = data as Tela;

  const Componente = telasRegistradas[codigo];
  const ehDev = sessao.perfil.perfil === 'desenvolvedor';

  if (tela.status === 'em_desenvolvimento') {
    return (
      <>
        <PageHeader titulo={tela.nome} subtitulo={rotuloArea(tela.area)} />
        <EmDesenvolvimento nome={tela.nome} />
      </>
    );
  }

  if (!Componente) {
    return (
      <>
        <PageHeader titulo={tela.nome} subtitulo={rotuloArea(tela.area)} />
        {ehDev ? (
          <div className="alerta alerta-aviso">
            A tela está <strong>{ROTULO_STATUS_TELA[tela.status as StatusTela]}</strong>, mas o código{' '}
            <code>{codigo}</code> ainda não está registrado em <code>src/screens/registry.ts</code>. Veja{' '}
            <code>docs/CRIAR_TELA.md</code>.
          </div>
        ) : (
          <EmDesenvolvimento nome={tela.nome} />
        )}
      </>
    );
  }

  return (
    <>
      {tela.status === 'inativa' && (
        <div className="alerta alerta-aviso">
          Esta tela está <strong>inativa</strong>. Só desenvolvedores conseguem vê-la.
        </div>
      )}
      <Componente tela={tela} />
    </>
  );
}
