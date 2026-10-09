import type { AreaId } from './codigo-tela';
import type { Perfil, StatusTela, StatusUsuario } from './perfis';

export interface PerfilUsuario {
  id: string;
  email: string;
  nome: string;
  perfil: Perfil;
  status: StatusUsuario;
  created_at: string;
}

export interface Tela {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  area: AreaId;
  status: StatusTela;
  created_at: string;
}

export interface ItemMenu {
  id: string;
  grupo: string | null;
  rotulo: string;
  icone: string;
  tela_id: string;
  ordem: number;
  ativo: boolean;
}

type TelaResumo = Pick<Tela, 'codigo' | 'nome' | 'status'>;

/**
 * Item do menu já com os dados da tela (join feito na consulta).
 * O Supabase pode devolver a relação como objeto ou array; use telaDoItem().
 */
export interface ItemMenuComTela extends ItemMenu {
  telas: TelaResumo | TelaResumo[] | null;
}

export function telaDoItem(item: ItemMenuComTela): TelaResumo | null {
  if (!item.telas) return null;
  return Array.isArray(item.telas) ? (item.telas[0] ?? null) : item.telas;
}
