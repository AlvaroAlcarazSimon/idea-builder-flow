#!/usr/bin/env bash
# Simulación continua (DRY_RUN) copiando a los traders de simulacion/traders.json.
#   ./simulacion/simular.sh           arranca en segundo plano si no está corriendo (restaura el estado guardado)
#   ./simulacion/simular.sh primer-plano   igual, pero sin soltarse de la terminal (para pm2, systemd o una tarea vigilada)
#   ./simulacion/simular.sh resumen   regenera simulacion/RESUMEN.md y guarda una copia del estado en el repo
#   ./simulacion/simular.sh parar     detiene la simulación
set -euo pipefail
cd "$(dirname "$0")/.."
SIM_DIR="${SIM_DIR:-$HOME/.copybot-sim}"
mkdir -p "$SIM_DIR"
PID_FILE="$SIM_DIR/bot.pid"

# Comprueba el pid y que de verdad sea la simulación (tras un reinicio el número puede ser de otro proceso)
running() { [ -f "$PID_FILE" ] && ps -p "$(cat "$PID_FILE")" -o args= 2>/dev/null | grep -q -e "--sim" -e "simular.sh"; }

prepare() {
  if [ ! -f "$SIM_DIR/state.json" ] && [ -f simulacion/estado.json ]; then
    cp simulacion/estado.json "$SIM_DIR/state.json"
    echo "Estado restaurado desde simulacion/estado.json"
  fi
  [ -d node_modules ] || npm install --silent
  TARGETS=$(node -e "const t = require('./simulacion/traders.json'); console.log(Object.keys(t).filter((w) => !t[w].includes('descartado')).join(','))")
  echo "=== arranque de la simulación $(date -u +%FT%TZ) ===" >> "$SIM_DIR/bot.log"
}

# "--sim" no lo usa el bot: solo sirve para poder parar la simulación sin tocar un bot real que esté corriendo
bot_cmd() {
  echo "env NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1 TARGET_WALLETS='$TARGETS' DRY_RUN=true \
    MAX_OPEN_POSITIONS=40 MAX_DAILY_LOSS_SOL=100 POLL_INTERVAL_SEC=3 PRICE_CHECK_INTERVAL_SEC=10 \
    RPC_URL='${RPC_URL:-https://api.mainnet-beta.solana.com}' STATE_FILE='$SIM_DIR/state.json' LOG_FILE='$SIM_DIR/bot.log' \
    npx tsx src/index.ts --sim 2>&1 | grep --line-buffered -v '^ws error' >> '$SIM_DIR/stdout.log'"
}

case "${1:-arrancar}" in
  resumen)
    STATE_FILE="$SIM_DIR/state.json" LOG_FILE="$SIM_DIR/bot.log" npx tsx src/report.ts --names simulacion/traders.json > simulacion/RESUMEN.md
    [ -f "$SIM_DIR/state.json" ] && cp "$SIM_DIR/state.json" simulacion/estado.json
    if running; then echo "Simulación en marcha (pid $(cat "$PID_FILE"))"; else echo "⚠️  La simulación NO está corriendo"; fi
    ;;
  parar)
    if running; then kill "$(cat "$PID_FILE")" 2>/dev/null || true; fi
    pkill -f "src/index.ts --sim" 2>/dev/null && echo "Simulación detenida" || echo "No estaba corriendo"
    rm -f "$PID_FILE"
    ;;
  primer-plano)
    if running; then echo "La simulación ya está corriendo (pid $(cat "$PID_FILE"))"; exit 0; fi
    prepare
    echo $$ > "$PID_FILE"
    echo "Simulación en primer plano copiando a: $TARGETS"
    eval "$(bot_cmd)"
    ;;
  arrancar)
    if running; then echo "La simulación ya está corriendo (pid $(cat "$PID_FILE"))"; exit 0; fi
    prepare
    setsid nohup bash -c "$(bot_cmd)" >/dev/null 2>&1 &
    echo $! > "$PID_FILE"
    sleep 5
    if running; then echo "Simulación arrancada (pid $(cat "$PID_FILE")) copiando a: $TARGETS"; else echo "❌ No arrancó, mira $SIM_DIR/stdout.log"; exit 1; fi
    ;;
esac
