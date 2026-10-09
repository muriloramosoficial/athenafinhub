import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirPerfil } from '@/lib/sessao';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { FormAcao, BotaoEnviar } from '@/components/FormAcao';
import { PromptCopiar } from './PromptCopiar';
import { telasRegistradas } from '@/screens/registry';
import { atualizarTela, atualizarStatusTela, atualizarPerfisTela } from '@/app/actions/telas';
import { rotuloArea } from '@/lib/codigo-tela';
import { gerarPromptTela } from '@/lib/prompt-ia';
import { ROTULO_STATUS_TELA, STATUS_TELA, type StatusTela } from '@/lib/perfis';
import type { Tela } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export default async function PaginaGerenciarTela({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ criada?: string }>;
}) {
  const { codigo } = await params;
  const { criada } = await searchParams;
  const sessao = await exigirPerfil(['desenvolvedor']);
  const supabase = sessao.supabase;

  const { data } = await supabase
    .from('telas')
    .select('id, codigo, nome, descricao, area, status, created_at')
    .eq('codigo', codigo)
    .maybeSingle();
  if (!data) notFound();
  const tela = data as Tela;

  const [{ data: perfisPadrao }, { data: menus }] = await Promise.all([
    supabase.from('tela_acesso_perfil').select('perfil').eq('tela_id', tela.id),
    supabase.from('menu_itens').select('id, rotulo, grupo, ativo').eq('tela_id', tela.id),
  ]);
  const perfisMarcados = new Set((perfisPadrao ?? []).map((p) => p.perfil as string));
  const registrada = Boolean(telasRegistradas[tela.codigo]);
  const prompt = gerarPromptTela(tela);

  return (
    <>
      <PageHeader
        titulo={tela.nome}
        subtitulo={`${rotuloArea(tela.area)} · tabela public.${tela.codigo}`}
        acoes={<Link href="/admin/telas" className="btn btn-secundario">Voltar às telas</Link>}
      />

      {criada && (
        <div className="alerta alerta-ok">
          Tela criada com sucesso! A tabela <code>{tela.codigo}</code> já existe no banco. Agora gere o
          desenvolvimento com a ficha abaixo.
        </div>
      )}

      <div className="grade-admin">
        <section className="cartao">
          <h2>Dados da tela</h2>
          <FormAcao acao={atualizarTela}>
            <input type="hidden" name="id" value={tela.id} />
            <label className="campo">
              <span>Código (não pode ser alterado)</span>
              <input value={tela.codigo} disabled />
            </label>
            <label className="campo">
              <span>Nome</span>
              <input name="nome" defaultValue={tela.nome} required minLength={2} maxLength={80} />
            </label>
            <label className="campo">
              <span>Descrição</span>
              <textarea name="descricao" rows={3} defaultValue={tela.descricao ?? ''} />
            </label>
            <BotaoEnviar>Salvar dados</BotaoEnviar>
          </FormAcao>
        </section>

        <section className="cartao">
          <h2>Status</h2>
          <p>
            Atual: <Badge tipo={tela.status === 'ativa' ? 'ok' : tela.status === 'inativa' ? 'erro' : 'aviso'}>
              {ROTULO_STATUS_TELA[tela.status as StatusTela]}
            </Badge>
          </p>
          <p className="texto-suave">
            <strong>Em desenvolvimento</strong>: a tela mostra o aviso de construção (para todos com acesso).<br />
            <strong>Ativa</strong>: a tela é exibida com o código registrado.<br />
            <strong>Inativa</strong>: some do menu de todos, exceto desenvolvedores.
          </p>
          <FormAcao acao={atualizarStatusTela}>
            <input type="hidden" name="id" value={tela.id} />
            <label className="campo">
              <span>Novo status</span>
              <select name="status" defaultValue={tela.status}>
                {STATUS_TELA.map((s) => (
                  <option key={s} value={s}>{ROTULO_STATUS_TELA[s]}</option>
                ))}
              </select>
            </label>
            <BotaoEnviar variante="secundario">Atualizar status</BotaoEnviar>
          </FormAcao>
        </section>

        <section className="cartao">
          <h2>Acesso padrão por perfil</h2>
          <p className="texto-suave">Exceções por pessoa são feitas em Administração → Usuários e acessos.</p>
          <FormAcao acao={atualizarPerfisTela}>
            <input type="hidden" name="id" value={tela.id} />
            <label className="check">
              <input type="checkbox" name="perfis" value="gestor" defaultChecked={perfisMarcados.has('gestor')} /> Gestores
            </label>
            <label className="check">
              <input type="checkbox" name="perfis" value="colaborador" defaultChecked={perfisMarcados.has('colaborador')} /> Colaboradores
            </label>
            <BotaoEnviar variante="secundario">Salvar perfis</BotaoEnviar>
          </FormAcao>
        </section>

        <section className="cartao">
          <h2>Situação técnica</h2>
          <ul className="lista-checagem">
            <li className="ok">Tabela <code>public.{tela.codigo}</code> criada com RLS</li>
            <li className={registrada ? 'ok' : 'pendente'}>
              {registrada
                ? <>Código registrado em <code>src/screens/registry.ts</code></>
                : <>Ainda <strong>não</strong> registrado em <code>src/screens/registry.ts</code> (faça isso após a IA criar a tela)</>}
            </li>
            <li className={(menus ?? []).length > 0 ? 'ok' : 'pendente'}>
              {(menus ?? []).length > 0
                ? `Usada em ${(menus ?? []).length} item(ns) de menu`
                : <>Sem item de menu. Crie em <Link href="/admin/menus">Menus</Link>.</>}
            </li>
          </ul>
        </section>

        <section className="cartao cartao-largo">
          <h2>Ficha para a IA desenvolver esta tela</h2>
          <p className="texto-suave">
            Copie o texto abaixo, preencha a última seção (o que a tela deve fazer) e envie para a IA no seu
            projeto. As regras de estrutura já estão incluídas.
          </p>
          <PromptCopiar texto={prompt} />
        </section>
      </div>
    </>
  );
}
