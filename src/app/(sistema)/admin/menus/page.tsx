import { exigirPerfil } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import Icone from '@/components/Icone';
import { NovoMenuForm } from './NovoMenuForm';
import { alternarMenu, excluirMenu } from '@/app/actions/menus';
import { telaDoItem, type ItemMenuComTela, type Tela } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export default async function PaginaMenus() {
  const sessao = await exigirPerfil(['desenvolvedor']);
  const supabase = sessao.supabase;

  const [{ data: itens }, { data: telas }] = await Promise.all([
    supabase
      .from('menu_itens')
      .select('id, grupo, rotulo, icone, tela_id, ordem, ativo, telas(codigo, nome, status)')
      .order('grupo', { ascending: true, nullsFirst: true })
      .order('ordem', { ascending: true }),
    supabase.from('telas').select('id, codigo, nome, status').order('codigo'),
  ]);

  const lista = (itens ?? []) as ItemMenuComTela[];
  const grupos = [...new Set(lista.map((i) => i.grupo).filter((g): g is string => Boolean(g)))];

  return (
    <>
      <PageHeader
        titulo="Menus"
        subtitulo="Cada item do menu abre uma tela. Só aparece para quem tem acesso àquela tela."
      />
      <div className="grade-admin">
        <section className="cartao">
          <h2>Itens do menu ({lista.length})</h2>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Rótulo</th>
                  <th>Ícone</th>
                  <th>Abre a tela</th>
                  <th>Ordem</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Grupo">{item.grupo ?? <span className="texto-suave">— (topo)</span>}</td>
                    <td data-label="Rótulo"><Icone nome={item.icone} /> {item.rotulo}</td>
                    <td data-label="Ícone"><code>{item.icone}</code></td>
                    <td data-label="Abre a tela"><code>{telaDoItem(item)?.codigo ?? '—'}</code></td>
                    <td data-label="Ordem">{item.ordem}</td>
                    <td data-label="Situação">
                      <Badge tipo={item.ativo ? 'ok' : 'neutro'}>{item.ativo ? 'Visível' : 'Oculto'}</Badge>
                    </td>
                    <td className="celula-acoes">
                      <form action={alternarMenu}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="ativo" value={String(!item.ativo)} />
                        <button className="btn btn-secundario btn-pequeno">{item.ativo ? 'Ocultar' : 'Mostrar'}</button>
                      </form>
                      <form action={excluirMenu}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="btn btn-perigo btn-pequeno">Excluir</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr><td colSpan={7} className="texto-suave">Nenhum item de menu ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <h2>Novo item de menu</h2>
          <NovoMenuForm telas={(telas ?? []) as Pick<Tela, 'id' | 'codigo' | 'nome' | 'status'>[]} grupos={grupos} />
        </section>
      </div>
    </>
  );
}
