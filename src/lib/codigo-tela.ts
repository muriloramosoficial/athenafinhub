/**
 * Códigos de tela.
 *
 * Padrão:  <prefixo_da_area>_<nome_da_tela>
 *   gl_  -> Global            (ex.: gl_visao_geral)
 *   tes_ -> Tesouraria        (ex.: tes_conciliacao_bancaria)
 *   cap_ -> Contas a Pagar    (ex.: cap_fornecedores)
 *   car_ -> Contas a Receber  (ex.: car_inadimplencia)
 *   bi_  -> Business Inteligência (ex.: bi_fluxo_caixa)
 *
 * O código é o nome da tabela no banco (public.<codigo>) e é usado para
 * pedir o desenvolvimento da tela a uma IA. Use só letras minúsculas,
 * números e "_" (sem acentos, espaços ou hífens).
 */
export const AREAS = [
  { id: 'global', rotulo: 'Global', prefixo: 'gl' },
  { id: 'tesouraria', rotulo: 'Tesouraria', prefixo: 'tes' },
  { id: 'contas_pagar', rotulo: 'Contas a Pagar', prefixo: 'cap' },
  { id: 'contas_receber', rotulo: 'Contas a Receber', prefixo: 'car' },
  { id: 'bi', rotulo: 'Business Inteligência (BI)', prefixo: 'bi' },
] as const;

export type AreaId = (typeof AREAS)[number]['id'];

export function ehArea(valor: unknown): valor is AreaId {
  return AREAS.some((a) => a.id === valor);
}

export function rotuloArea(area: string): string {
  return AREAS.find((a) => a.id === area)?.rotulo ?? area;
}

export function prefixoDaArea(area: AreaId): string {
  return AREAS.find((a) => a.id === area)!.prefixo;
}

/** Converte um texto livre em um slug seguro: "Conciliação Bancária" -> "conciliacao_bancaria" */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/** Sugere um código a partir da área e do nome (o usuário pode ajustar). */
export function sugerirCodigo(area: string, nome: string): string {
  if (!ehArea(area)) return '';
  const slug = slugify(nome);
  return slug ? `${prefixoDaArea(area)}_${slug}` : `${prefixoDaArea(area)}_`;
}

const REGEX_CODIGO = /^(gl|tes|cap|car|bi)_[a-z0-9]+(_[a-z0-9]+)*$/;

/**
 * Valida um código para uma área. Retorna a mensagem de erro, ou null se válido.
 * (A validação definitiva também é feita no banco, em criar_tela.)
 */
export function validarCodigo(codigo: string, area: string): string | null {
  if (!ehArea(area)) return 'Selecione uma área válida.';
  if (!REGEX_CODIGO.test(codigo)) {
    return 'Use apenas letras minúsculas, números e "_", começando pelo prefixo (ex.: tes_conciliacao).';
  }
  if (codigo.length < 4 || codigo.length > 48) return 'O código deve ter entre 4 e 48 caracteres.';
  if (!codigo.startsWith(`${prefixoDaArea(area)}_`)) {
    return `Para a área ${rotuloArea(area)} o código deve começar com "${prefixoDaArea(area)}_".`;
  }
  return null;
}
