import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { FormAcao, BotaoEnviar } from '@/components/FormAcao';
import { atualizarUsuario } from '@/app/actions/usuarios';
import { ROTULO_PERFIL, ROTULO_STATUS_USUARIO, type Perfil, type StatusUsuario } from '@/lib/perfis';
import type { PerfilUsuario } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

const ORDEM_STATUS: Record<string, number> = { pendente: 0, ativo: 1, bloqueado: 2 };

export default async function PaginaUsuarios() {
  const sessao = await exigirPerfil(['desenvolvedor', 'gestor']);
  const { data } = await sessao.supabase
    .from('perfis')
    .select('id, email, nome, perfil, status, created_at')
    .order('created_at', { ascending: false });

  const usuarios = ((data ?? []) as PerfilUsuario[]).sort(
    (a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || a.nome.localeCompare(b.nome),
  );
  const pendentes = usuarios.filter((u) => u.status === 'pendente').length;

  return (
    <>
      <PageHeader
        titulo="Usuários e acessos"
        subtitulo={
          pendentes > 0
            ? `${pendentes} cadastro(s) aguardando aprovação.`
            : 'Aprove cadastros e ajuste as telas que cada colaborador enxerga.'
        }
      />
      <section className="cartao">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const podeEditar = sessao.perfil.perfil === 'desenvolvedor' || u.perfil === 'colaborador';
                return (
                  <tr key={u.id}>
                    <td data-label="Nome">{u.nome}{u.id === sessao.user.id && <span className="texto-suave"> (você)</span>}</td>
                    <td data-label="E-mail">{u.email}</td>
                    <td data-label="Perfil">{ROTULO_PERFIL[u.perfil as Perfil]}</td>
                    <td data-label="Situação">
                      <Badge tipo={u.status === 'ativo' ? 'ok' : u.status === 'bloqueado' ? 'erro' : 'aviso'}>
                        {ROTULO_STATUS_USUARIO[u.status as StatusUsuario]}
                      </Badge>
                    </td>
                    <td className="celula-acoes">
                      {u.status === 'pendente' && u.id !== sessao.user.id && (
                        <FormAcao acao={atualizarUsuario} className="formulario-inline">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="ativo" />
                          <BotaoEnviar pequeno>Aprovar</BotaoEnviar>
                        </FormAcao>
                      )}
                      {u.status === 'ativo' && u.id !== sessao.user.id && podeEditar && (
                        <FormAcao acao={atualizarUsuario} className="formulario-inline">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="bloqueado" />
                          <BotaoEnviar variante="perigo" pequeno>Bloquear</BotaoEnviar>
                        </FormAcao>
                      )}
                      {u.status === 'bloqueado' && podeEditar && (
                        <FormAcao acao={atualizarUsuario} className="formulario-inline">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="ativo" />
                          <BotaoEnviar variante="secundario" pequeno>Desbloquear</BotaoEnviar>
                        </FormAcao>
                      )}
                      {podeEditar && (
                        <Link href={`/admin/usuarios/${u.id}`} className="btn btn-secundario btn-pequeno">
                          Configurar
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && <tr><td colSpan={5} className="texto-suave">Nenhum usuário.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
