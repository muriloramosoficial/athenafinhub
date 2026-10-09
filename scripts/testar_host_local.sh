#!/usr/bin/env bash
# Testa o bloqueio de Host do middleware no runtime local da Cloudflare (workerd).
# Uso: npm run build:cf && bash scripts/testar_host_local.sh
# Requer um arquivo .dev.vars com APP_ALLOWED_HOSTS=intranet.teste.com (criado automaticamente abaixo, se faltar).
set -u
PORTA=8790
cd "$(dirname "$0")/.." || exit 1

if [ ! -f .dev.vars ]; then
  echo "Crie o arquivo .dev.vars (copie de .dev.vars.example) antes de rodar este teste."
  exit 1
fi

npx opennextjs-cloudflare preview --port $PORTA > /tmp/athena-preview.log 2>&1 &
PID=$!
sleep 25

echo "1) Host do workers.dev (esperado 403):"
curl -s -m 20 -o /dev/null -w "   %{http_code}\n" -H "Host: meuapp.workers.dev" http://127.0.0.1:$PORTA/login
echo "2) Host da intranet, rota protegida sem sessão (esperado 307):"
curl -s -m 20 -o /dev/null -w "   %{http_code}\n" -H "Host: intranet.teste.com" http://127.0.0.1:$PORTA/t/gl_visao_geral
echo "3) Host com porta (esperado 307):"
curl -s -m 20 -o /dev/null -w "   %{http_code}\n" -H "Host: intranet.teste.com:$PORTA" http://127.0.0.1:$PORTA/t/gl_visao_geral

kill $PID 2>/dev/null
sleep 1
ps -eo pid,args | grep -E "[w]orkerd" | awk '{print $1}' | xargs -r kill 2>/dev/null
true
