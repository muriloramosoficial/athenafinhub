// Teste rápido da normalização de APP_ALLOWED_HOSTS.
// Rodar: node --experimental-strip-types scripts/testar_hosts.mjs
import { normalizarHost, listaDeHostsPermitidos } from '../src/lib/hosts.ts';

const casos = [
  ['intranet.suaempresa.com.br', 'intranet.suaempresa.com.br'],
  ['https://athenafinhub.murilo-pires.workers.dev/', 'athenafinhub.murilo-pires.workers.dev'],
  ['HTTPS://Intranet.Empresa.com.br:443/login', 'intranet.empresa.com.br'],
  ['localhost:3000', 'localhost'],
  ['  intranet.empresa.com.br  ', 'intranet.empresa.com.br'],
];
let ok = true;
for (const [entrada, esperado] of casos) {
  const obtido = normalizarHost(entrada);
  if (obtido !== esperado) { ok = false; console.log('FALHOU', entrada, '->', obtido); }
}
const lista = listaDeHostsPermitidos('https://a.com/, b.com:8080 ,, ');
if (JSON.stringify(lista) !== '["a.com","b.com"]') { ok = false; console.log('FALHOU lista', lista); }
console.log(ok ? `OK: ${casos.length + 1} verificações` : 'ERRO');
process.exit(ok ? 0 : 1);
