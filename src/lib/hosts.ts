/**
 * Normalização de hosts permitidos (APP_ALLOWED_HOSTS).
 * Aceita, em qualquer formato comum, o mesmo endereço:
 *   intranet.suaempresa.com.br
 *   https://intranet.suaempresa.com.br/
 *   INTRANET.suaempresa.com.br:443
 * Sem este tratamento, "https://..." vira "https" e nunca bate com o host.
 */
export function normalizarHost(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '') // remove o protocolo (https://)
    .split('/')[0] // remove caminho (/ ou /login)
    .split(':')[0]; // remove porta
}

/** Lista de hosts a partir do texto da variável (separados por vírgula). */
export function listaDeHostsPermitidos(texto: string | undefined): string[] {
  return (texto ?? '')
    .split(',')
    .map(normalizarHost)
    .filter((h) => h.length > 0);
}
