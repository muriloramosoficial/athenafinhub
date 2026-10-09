import { obterUsuarioAutenticado } from '@/lib/sessao';
import { sair } from '@/app/actions/auth';
import { Logo } from '@/components/Logo';
import { redirect } from 'next/navigation';

const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  pendente: {
    titulo: 'Cadastro aguardando aprovação',
    texto: 'Seu cadastro foi recebido. Um Gestor ou Desenvolvedor precisa liberar seu acesso.',
  },
  bloqueado: {
    titulo: 'Acesso bloqueado',
    texto: 'Seu acesso ao Athena FinHub está bloqueado. Procure a equipe responsável.',
  },
  sem_permissao: {
    titulo: 'Sem permissão',
    texto: 'Você não tem permissão para acessar esta área.',
  },
  sem_perfil: {
    titulo: 'Cadastro não encontrado',
    texto: 'Sua conta existe, mas não há um cadastro de acesso vinculado a ela. Procure a equipe de TI.',
  },
};

export default async function PaginaSemAcesso({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const usuario = await obterUsuarioAutenticado();
  if (!usuario) redirect('/login');
  const msg = MENSAGENS[motivo ?? ''] ?? MENSAGENS.sem_permissao;

  return (
    <div className="pagina-central">
      <div className="cartao cartao-estreito">
        <Logo grande />
        <h1 className="titulo-centro">{msg.titulo}</h1>
        <p className="texto-centro">{msg.texto}</p>
        <p className="texto-suave texto-centro">Conectado como <strong>{usuario.email}</strong></p>
        <form action={sair}>
          <button className="btn btn-secundario btn-bloco">Sair</button>
        </form>
      </div>
    </div>
  );
}
