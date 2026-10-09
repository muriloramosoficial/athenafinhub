import { redirect } from 'next/navigation';
import { exigirSessaoAtiva, obterTelasPermitidas } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

/** Página inicial: leva para a Visão Geral ou para a primeira tela liberada. */
export default async function Inicio() {
  await exigirSessaoAtiva();
  const permitidas = await obterTelasPermitidas();

  if (permitidas.has('gl_visao_geral')) redirect('/t/gl_visao_geral');
  const primeira = [...permitidas][0];
  if (primeira) redirect(`/t/${primeira}`);

  return (
    <>
      <PageHeader titulo="Bem-vindo ao Athena FinHub" />
      <div className="cartao cartao-vazio">
        <h2>Nenhuma tela liberada</h2>
        <p className="texto-suave">
          Seu acesso está ativo, mas ainda não há telas liberadas para o seu perfil. Fale com um Gestor.
        </p>
      </div>
    </>
  );
}
