import type { Tela } from '@/lib/tipos';

/**
 * Contrato de toda tela do sistema.
 * Cada tela é um componente React (Server Component) que recebe a tela cadastrada.
 */
export interface PropsTela {
  tela: Tela;
}
