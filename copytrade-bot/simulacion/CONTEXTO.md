# Contexto para seguir el trabajo (léelo primero)

Todo el código está en la rama `claude/optimistic-mayer-rbu76f`, carpeta `copytrade-bot/`.
El usuario habla español, no es técnico y quiere las horas en **hora de España**.

## Qué hay hecho
- **Bot de copytrade** para memecoins de Solana (README.md): detecta las operaciones del trader
  por cambios de saldo + lectura del bloque (inmune al ruido de terceros), copia compras/ventas vía
  Jupiter, con take profit, stop loss, trailing stop, filtros anti-rug y filtros de copia:
  - `MAX_ENTRY_PREMIUM_PCT` (no entra si el precio ya subió >25% desde su compra),
  - `COPY_ONLY_NEW_POSITIONS` (no copia ampliaciones),
  - `REBUY_COOLDOWN_MIN`, `MIN_MIRROR_SELL_PCT`, red de seguridad de ventas por saldo.
- **Cribado de traders**: `npm run screen -- --kolscan` o con wallets. Mide el *beneficio copiable*
  (trades de más de 5 min) frente al de scalping.
- **Simulación continua** (`simulacion/simular.sh`, resultados en `simulacion/RESUMEN.md`).

## Qué hemos aprendido
- El trader original, **Limfork.eth** (`BQVz7fQ1WsQmSTMY3umdPEPPTm1sdcBcX9sP7o6kPRmB`), es muy rentable
  (+1.079 SOL/30 días en Kolscan) pero es un *scalper* (~59 trades/día, posiciones de segundos):
  copiarle pierde dinero.
- De los ~80 traders de Kolscan, casi todos son scalpers o van en negativo últimamente.
- En la simulación (unas 15 h): **big bags bobby** (`8oQoMhfBQnRspn7QtNAq2aPThRE4q94kLSTwaaFQvRgs`)
  queda casi en tablas (+0,011 SOL en 5 trades). Es rentable en su historial (+38k $), pero su margen
  (~5% por operación) se lo come el retraso de copiarle. **peacefuldestroy** pierde (−0,19 SOL en 26
  trades). **CookDoc** no es copiable (cuando compra en serio, el precio ya ha saltado).
- **Ser famoso es malo para copiar**: los KOL tienen miles de seguidores y el precio se dispara justo
  después de su compra (sobreprecios del 35-63% vistos en directo).

## Siguiente paso pedido por el usuario
Buscar **wallets rentables y poco conocidas** (que no copie casi nadie) usando Helius
(clave en la variable de entorno `HELIUS_API_KEY`; dominios `mainnet.helius-rpc.com` y `api.helius.xyz`):
1. Coger tokens que hicieron x10-x100 en los últimos días (DexScreener) y sacar sus compradores tempranos
   con el historial parseado de Helius (`/v0/addresses/{addr}/transactions?type=SWAP`).
2. Quedarse con las wallets que repiten acierto en varios tokens, no son bots (no cientos de trades al día)
   y aguantan posiciones minutos u horas.
3. Analizar 30-90 días de cada una (beneficio copiable, no depender de un pelotazo, pocos seguidores/no KOL).
4. Meter las mejores en la simulación (`simulacion/traders.json`) y comparar con bobby.

## Pendiente de respuesta del usuario
- Quitar de la simulación a peacefuldestroy, Walta, Pikalosi, Killua y CookDoc (dejar a bobby).
- Regla nueva: no volver a entrar en un token donde el bot ya perdió.

## Ojo
- La simulación de la sesión anterior está **parada** (el usuario lo pidió el 22/10 a las 12:36 hora de
  España) y su tarea programada ("Resumen horario simulación copytrade") está desactivada. El estado final
  está en `simulacion/estado.json` y `simulacion/RESUMEN.md`. Para retomarla aquí:
  `SIM_DIR=<carpeta> ./simulacion/simular.sh primer-plano` (como tarea en segundo plano vigilada).
- Nunca pedir al usuario que pegue claves en el chat. Siempre `DRY_RUN=true` hasta que el usuario decida.
