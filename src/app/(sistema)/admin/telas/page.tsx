import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { NovaTelaForm } from './NovaTelaForm';
import { rotuloArea } from '@/lib/codigo-tela';
import { ROTULO_STATUS_TELA, type StatusTela } from '@/lib/perfis';
import type { Tela } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export default async function PaginaAdminTelas() {
  const sessao = await exigirPerfil(['desenvolvedor']);
  const { data } = await sessao.supabase
    .from('telas')
    .select('id, codigo, nome, descricao, area, status, created_at')
    .order('area', { ascending: true })
    .order('codigo', { ascending: true });
  const telas = (data ?? []) as Tela[];

  return (
    <>
      <PageHeader
        titulo="Telas"
        subtitulo="Cadastre telas, acompanhe o status e gere a ficha para a IA desenvolver cada uma."
      />
      <div className="grade-admin">
        <section className="cartao">
          <h2>Telas cadastradas ({telas.length})</h2>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Área</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {telas.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Código"><code>{t.codigo}</code></td>
                    <td data-label="Nome">{t.nome}</td>
                    <td data-label="Área">{rotuloArea(t.area)}</td>
                    <td data-label="Status">
                      <Badge tipo={t.status === 'ativa' ? 'ok' : t.status === 'inativa' ? 'erro' : 'aviso'}>
                        {ROTULO_STATUS_TELA[t.status as StatusTela]}
                      </Badge>
                    </td>
                    <td className="celula-acoes">
                      <Link href={`/admin/telas/${t.codigo}`} className="btn btn-secundario btn-pequeno">Gerenciar</Link>
                    </td>
                  </tr>
                ))}
                {telas.length === 0 && (
                  <tr><td colSpan={5} className="texto-suave">Nenhuma tela cadastrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <h2>Nova tela</h2>
          <p className="texto-suave">
            O código é gerado automaticamente a partir da área e do nome. Ele vira o nome da tabela da tela no banco.
          </p>
          <NovaTelaForm />
        </section>
      </div>
    </>
  );
}
