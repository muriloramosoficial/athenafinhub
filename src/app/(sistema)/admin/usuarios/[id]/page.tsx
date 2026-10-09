import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirPerfil } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { FormAcao, BotaoEnviar } from '@/components/FormAcao';
import { atualizarUsuario, salvarPermissoesUsuario } from '@/app/actions/usuarios';
import { rotuloArea } from '@/lib/codigo-tela';
import {
  PERFIS,
  ROTULO_PERFIL,
  ROTULO_STATUS_USUARIO,
  STATUS_USUARIO,
  ROTULO_STATUS_TELA,
  type Perfil,
  type StatusTela,
  type StatusUsuario,
} from '@/lib/perfis';
import type { PerfilUsuario, Tela } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export default async function PaginaUsuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirPerfil(['desenvolvedor', 'gestor']);
  const supabase = sessao.supabase;
  const ehDev = sessao.perfil.perfil === 'desenvolvedor';

  const { data: alvoData } = await supabase
    .from('perfis')
    .select('id, email, nome, perfil, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!alvoData) notFound();
  const alvo = alvoData as PerfilUsuario;

  // Gestor só configura colaboradores
  const podeEditarAcesso = ehDev || alvo.perfil === 'colaborador';
  const podeEditarPerfil = ehDev && alvo.id !== sessao.user.id;

  const [{ data: telasData }, { data: padraoData }, { data: excecoesData }] = await Promise.all([
    supabase.from('telas').select('id, codigo, nome, area, status').order('area').order('codigo'),
    supabase.from('tela_acesso_perfil').select('tela_id').eq('perfil', alvo.perfil),
    supabase.from('tela_acesso_usuario').select('tela_id, permitido').eq('usuario_id', alvo.id),
  ]);

  const telas = (telasData ?? []) as Pick<Tela, 'id' | 'codigo' | 'nome' | 'area' | 'status'>[];
  const padrao = new Set((padraoData ?? []).map((p) => p.tela_id as string));
  const excecoes = new Map((excecoesData ?? []).map((e) => [e.tela_id as string, e.permitido as boolean]));

  return (
    <>
      <PageHeader
        titulo={alvo.nome}
        subtitulo={`${alvo.email} · ${ROTULO_PERFIL[alvo.perfil as Perfil]}`}
        acoes={<Link href="/admin/usuarios" className="btn btn-secundario">Voltar</Link>}
      />

      <div className="grade-admin">
        <section className="cartao">
          <h2>Dados e situação</h2>
          <p>
            Situação atual:{' '}
            <Badge tipo={alvo.status === 'ativo' ? 'ok' : alvo.status === 'bloqueado' ? 'erro' : 'aviso'}>
              {ROTULO_STATUS_USUARIO[alvo.status as StatusUsuario]}
            </Badge>
          </p>
          <FormAcao acao={atualizarUsuario}>
            <input type="hidden" name="id" value={alvo.id} />
            <label className="campo">
              <span>Nome</span>
              <input name="nome" defaultValue={alvo.nome} minLength={3} disabled={!ehDev && alvo.id !== sessao.user.id} />
            </label>
            <label className="campo">
              <span>Perfil (papel)</span>
              <select name="perfil" defaultValue={alvo.perfil} disabled={!podeEditarPerfil}>
                {PERFIS.map((p) => <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>)}
              </select>
              {!ehDev && <small className="texto-suave">Somente desenvolvedores alteram o perfil.</small>}
            </label>
            <label className="campo">
              <span>Situação</span>
              <select name="status" defaultValue={alvo.status} disabled={alvo.id === sessao.user.id}>
                {STATUS_USUARIO.map((s) => <option key={s} value={s}>{ROTULO_STATUS_USUARIO[s]}</option>)}
              </select>
              {alvo.id === sessao.user.id && <small className="texto-suave">Você não pode alterar o próprio status.</small>}
            </label>
            <BotaoEnviar>Salvar dados</BotaoEnviar>
          </FormAcao>
        </section>

        <section className="cartao cartao-largo">
          <h2>Acesso às telas</h2>
          {alvo.perfil === 'desenvolvedor' && (
            <p className="alerta alerta-info">Desenvolvedores acessam todas as telas. Não há o que configurar.</p>
          )}
          {alvo.perfil !== 'desenvolvedor' && (
            <>
              <p className="texto-suave">
                Por padrão, o acesso vem do <strong>perfil</strong> ({ROTULO_PERFIL[alvo.perfil as Perfil]}).
                Use <em>Liberar</em> ou <em>Bloquear</em> para exceções deste usuário. Cada tela mostra o resultado final.
              </p>
              {!podeEditarAcesso && (
                <p className="alerta alerta-aviso">Você pode consultar, mas só desenvolvedores alteram o acesso de gestores.</p>
              )}
              <FormAcao acao={salvarPermissoesUsuario} className="formulario">
                <input type="hidden" name="usuario_id" value={alvo.id} />
                <div className="tabela-wrap">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Tela</th>
                        <th>Área</th>
                        <th>Padrão do perfil</th>
                        <th>Exceção</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telas.map((t) => {
                        const excecao = excecoes.get(t.id);
                        const valorInicial = excecao === undefined ? 'padrao' : excecao ? 'liberar' : 'bloquear';
                        const padraoLiberado = padrao.has(t.id);
                        const resultado = excecao ?? padraoLiberado;
                        return (
                          <tr key={t.id}>
                            <td data-label="Tela">
                              {t.nome}<br /><code>{t.codigo}</code>
                              {t.status === 'inativa' && <> <Badge tipo="erro">{ROTULO_STATUS_TELA[t.status as StatusTela]}</Badge></>}
                            </td>
                            <td data-label="Área">{rotuloArea(t.area)}</td>
                            <td data-label="Padrão do perfil">{padraoLiberado ? 'Liberada' : 'Bloqueada'}</td>
                            <td data-label="Exceção">
                              <select name={`tela_${t.id}`} defaultValue={valorInicial} disabled={!podeEditarAcesso}>
                                <option value="padrao">Usar padrão do perfil</option>
                                <option value="liberar">Liberar</option>
                                <option value="bloquear">Bloquear</option>
                              </select>
                            </td>
                            <td data-label="Resultado">
                              <Badge tipo={resultado ? 'ok' : 'neutro'}>{resultado ? 'Acessa' : 'Não acessa'}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {telas.length === 0 && <tr><td colSpan={5} className="texto-suave">Nenhuma tela cadastrada.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {podeEditarAcesso && <BotaoEnviar>Salvar acessos</BotaoEnviar>}
              </FormAcao>
            </>
          )}
        </section>
      </div>
    </>
  );
}
