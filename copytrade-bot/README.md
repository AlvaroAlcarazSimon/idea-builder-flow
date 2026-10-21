# 🤖 Memecoin Copytrade Bot (Solana)

Copia en tiempo real las compras y ventas de memecoins de una (o varias) wallets de Solana.
Funciona con cualquier sitio donde opere el trader: **Pump.fun, PumpSwap, Raydium, Meteora, Jupiter, Photon, BullX, Axiom, GMGN…**
porque no mira qué app usa, sino cómo cambian sus balances.

## Qué hace

| | |
|---|---|
| 👀 **Detección** | Avisa cuando cambia el saldo del trader (solo pasa cuando él opera), lee ese bloque y se queda solo con las transacciones **que él firma**. Inmune al spam y a los bots que mencionan su wallet cientos de veces por segundo. WebSocket + sondeo de respaldo. |
| 🟢 **Compra** | Tamaño fijo o proporcional al del trader, con mínimo y máximo. Ejecuta vía Jupiter con priority fee y reenvío de la tx hasta que confirma. |
| 🔴 **Venta** | Copia las ventas del trader **en la misma proporción** (si vende el 30%, vendes el 30%). Si mueve los tokens a otra wallet, también sales. Red de seguridad: cada 15 s mira cuántos tokens le quedan, así que aunque se pierda un aviso no te quedas atrapado. |
| 🎯 **Gestión propia** | Take profit parcial, stop loss, trailing stop y tiempo máximo. Tu salida no depende solo de él. |
| 🛡️ **Anti-rug** | Rechaza tokens con mint/freeze authority, simula la venta antes de comprar (detecta honeypots y tax tokens), límite de price impact, filtros opcionales de liquidez y market cap. |
| 💸 **Riesgo** | Máximo de posiciones abiertas, pérdida diaria máxima, reserva mínima de SOL, descarta señales que llegan tarde. |
| 🧪 **Simulación** | `DRY_RUN=true` hace *paper trading* con precios reales de Jupiter. Ves cuánto habrías ganado/perdido sin arriesgar nada. |
| 📱 **Telegram** | Aviso de cada compra, venta, cierre con PnL y alertas de posible rug. |
| 🔍 **Analizador** | `npm run analyze` revisa el historial del trader **antes** de copiarle (win rate, PnL, tiempo en posición…) o le escucha en directo con `--live`. |

## Puesta en marcha (5 minutos)

Necesitas **Node.js 20+**.

```bash
cd copytrade-bot
npm install
cp .env.example .env
```

1. **Analiza al trader primero** (de verdad, hazlo):
   ```bash
   npm run analyze -- WALLET_DEL_TRADER 500        # su historial reciente
   npm run analyze -- WALLET_DEL_TRADER --live 30  # escucharle 30 min en directo
   ```
   Si mantiene posiciones menos de 1 minuto, copiarle será muy difícil: tú siempre entras después que él.
   Si el analizador te dice que la wallet tiene "ruido" (traders conocidos: les mencionan miles de transacciones de bots), usa `--live`.

2. **Edita `.env`**: pon `TARGET_WALLETS` y un `RPC_URL` privado (el gratis de [Helius](https://helius.dev) sirve para empezar; el RPC público es lento y te hará llegar tarde).

3. **Arranca en simulación** (no gasta nada):
   ```bash
   npm start
   ```
   Déjalo varios días. Mira los resultados con `npm run status`.

4. **Si la simulación sale bien, pasa a real**:
   ```bash
   npm run wallet:new      # crea una wallet SOLO para el bot
   ```
   Pon la clave en `PRIVATE_KEY`, envía a esa dirección **solo lo que estés dispuesto a perder**, y cambia `DRY_RUN=false`.
   Antes de pasar a real, borra `data/state.json` para no mezclar posiciones simuladas con reales.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el bot |
| `npm run analyze -- <wallet> [n]` | Analiza las últimas `n` transacciones de un trader |
| `npm run analyze -- <wallet> --live [min]` | Escucha al trader en directo y resume lo que hace |
| `npm run screen -- --kolscan` | Busca traders copiables: coge la clasificación de [kolscan.io](https://kolscan.io/leaderboard), descarta scalpers y analiza el historial de cada uno |
| `npm run screen -- <w1> <w2> …` | Lo mismo con las wallets que tú le pases |
| `npm run status` | Posiciones abiertas, historial y PnL |
| `npm run sell-all` | 🚨 Botón del pánico: vende todo a SOL |
| `npm run wallet:new` | Genera una wallet nueva para el bot |
| `npm test` | Tests |

Para dejarlo corriendo 24/7 en un VPS: `npx pm2 start "npm start" --name copybot` y `npx pm2 logs copybot`.

## Configuración recomendada para empezar

La que viene en `.env.example`: 0.1 SOL por trade, máximo 5 posiciones, stop loss −40%, take profit del 50% al +100% y trailing stop del 30%.
Todos los parámetros están explicados en ese archivo.

## ⚠️ Lee esto antes de poner dinero

- **Siempre vas a entrar más caro que él.** Te enteras cuando su compra ya está en un bloque, y tu compra sale después. En tokens de Pump.fun de pocos miles de dólares de market cap, eso pueden ser 10–30% peor de precio. Su win rate no es tu win rate.
- **Los traders buenos saben que les copian.** Hay wallets que compran para que los bots les sigan y venderles encima. Si de repente pierdes en todos los trades que él gana, es eso. `MIN_TARGET_BUY_SOL` y `MAX_SIGNAL_AGE_SEC` ayudan algo.
- **La mayoría de memecoins acaban en cero.** Usa el stop loss y un tamaño pequeño.
- **Seguridad**: usa una wallet nueva solo para el bot, nunca tu wallet principal. No compartas el `.env` con nadie ni lo subas a GitHub (ya está en `.gitignore`).
- Esto no es asesoramiento financiero. Pruébalo en simulación primero.

## Simulación continua

`simulacion/simular.sh` deja el bot en simulación copiando a los traders de `simulacion/traders.json`
(arranca solo si no está corriendo y restaura el estado guardado). `./simulacion/simular.sh resumen`
regenera [`simulacion/RESUMEN.md`](simulacion/RESUMEN.md) con el resultado por trader, y `parar` la detiene.

## Cómo detecta las operaciones

Lo obvio sería suscribirse a "todas las transacciones que mencionan la wallet", pero con traders conocidos no funciona:
programas de terceros (bots de arbitraje, spam) incluyen su dirección como cuenta de solo lectura en **cientos de
transacciones por segundo**, y además les mandan miles de tokens basura. Un bot ingenuo se ahoga o copia cosas que el trader nunca hizo.

Por eso este bot:
1. Se suscribe al **saldo en SOL** del trader. Solo cambia cuando él opera (paga la fee) o le mandan SOL.
2. Lee ese bloque (~0,3 s) y se queda solo con las transacciones **firmadas por él**.
3. Si el WebSocket se pierde algo, un sondeo del saldo cada 2 s lo detecta y revisa los bloques intermedios.
4. Para las ventas, además, mira directamente cuántos tokens le quedan al trader cada 15 s.

Soporta transacciones de versión 0 y versión 1 (el formato nuevo de Solana).

## Cómo mejorarlo si quieres más velocidad

El bot usa WebSocket + Jupiter, que es lo más fiable y funciona en cualquier DEX. El RPC público de Solana corta
el WebSocket a menudo; con un RPC privado (Helius, QuickNode, Triton) la detección es más rápida y estable. Para rascar milisegundos:
- RPC de pago con **Yellowstone gRPC** (Helius, Triton) en vez de WebSocket.
- Enviar las transacciones por **Jito** o un servicio tipo Helius Sender / Nozomi.
- Ejecutar el VPS cerca de los validadores (Frankfurt / Ámsterdam / NY).

## Estructura

```
src/
  index.ts      arranque y orquestación
  watcher.ts    vigila las wallets (saldo por WebSocket + sondeo, lee los bloques y filtra lo que firman)
  parser.ts     detecta compras/ventas a partir de los cambios de balance
  trader.ts     estrategia: copiar, TP/SL/trailing, límites de riesgo
  executor.ts   ejecución en cadena vía Jupiter (y simulación)
  filters.ts    comprobaciones anti-rug
  jupiter.ts    cliente de la API de Jupiter
  state.ts      posiciones e historial en data/state.json
  notify.ts     Telegram
  analyze.ts    analizador de traders
```
