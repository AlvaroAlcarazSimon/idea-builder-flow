# Contexto para seguir el trabajo (léelo primero)

Todo el código está en la rama `claude/optimistic-mayer-rbu76f`, carpeta `copytrade-bot/`.
El usuario habla español, no es técnico y quiere las horas en **hora de España**.
Nunca pedir al usuario que pegue claves en el chat. Siempre `DRY_RUN=true` hasta que el usuario decida.

## ✅ Búsqueda hecha (23/10, ~12:00) — ver `BUSQUEDA.md`
- Finalistas verificadas (todas las operaciones, 30 d): **7gmjcpa** (+59 SOL, +35 sin sus 3 mejores, gana todas las semanas,
  1,3 SOL/compra, aguanta ~5 min, sobreprecio +3,7%) — la mejor; **2Y8uSmX** (+44, 1,4 compras/día); **95FNTS9** (+9,9);
  **DKFbE1h** (+7,5, aguanta 89 min, sobreprecio −4%).
- Con el mismo método: **ADR2 −72,7 SOL, bobby −97, Ht6b −151, 8CSE −10, 5vid −2,8, 7q3C +3, 7ciZ +58,5, 42wu scalper**.
  Lo que ADR2 da en la simulación sale de las reglas de venta del bot, no de que él gane.
- Pendiente de decidir con el usuario: qué wallets entran/salen de la simulación (no se ha tocado `traders.json`).
- Ojo: ya hay transacciones versión 1; usar `maxSupportedTransactionVersion: 1` (corregido en `verificar_wallets.py`).
- Helius volvía a tener saldo el 23/10 (la búsqueda gastó ~5.400 llamadas).

## Qué hay hecho
- **Bot de copytrade** para memecoins de Solana (README.md): detecta las operaciones del trader
  por cambios de saldo + lectura del bloque, copia compras/ventas vía Jupiter, con take profit, stop loss,
  trailing stop, filtros anti-rug y filtros de copia (`MAX_ENTRY_PREMIUM_PCT` 25%, `COPY_ONLY_NEW_POSITIONS`,
  `REBUY_COOLDOWN_MIN`, `MIN_MIRROR_SELL_PCT`, red de seguridad de ventas por saldo).
- **Simulación continua** (`simulacion/simular.sh`, resultados en `simulacion/RESUMEN.md`, estado en `estado.json`).
- **Verificador de wallets** `simulacion/verificar_wallets.py` (ver abajo: es el método fiable).

## Prueba de una semana (desde el 23/10, 14:11 hora de España)
- Desde las 12:26 la simulación vigila **7gmj, 2Y8u, 7ciZ y 7q3C** (la lleva la sesión session_01RJgUZJybSAzKJzMCrKYubM con
  una tarea horaria que reinicia simulación + temporizador y resume; no lanzar otra simulación en paralelo).
- Desde las **14:11 la simulación descuenta comisiones estimadas** (`SIM_FEE_LAMPORTS`, por defecto 0,002005 SOL por compra
  o venta = tope de priority fee + base, y `SIM_TOKEN_ACCOUNT_LAMPORTS` 0,00204 SOL por token nuevo, que el bot no recupera
  porque no cierra cuentas). Las operaciones anteriores no las incluyen. Con 0,1 SOL por operación es un 4-6% por trade.
- Expectativa honesta dada al usuario: lo más probable es quedar cerca de 0 (7gmj solo gana ~+1% por operación las
  2 últimas semanas; copiarle cuesta ~3,7% de entrada + salida tardía + comisiones; 2Y8u depende de pelotazos).
- Criterio de éxito propuesto (sin confirmar): tras una semana, 7gmj y 2Y8u en positivo con comisiones, en más de
  40 operaciones y sin depender de un solo trade. Si no, no se pasa a dinero real.

## Estado de la simulación (22/10, 23:30)
- Vigila (traders.json, lo que no lleva "(descartado)"): **7gmj, 2Y8u, 7ciZ, 7q3C** (cambio del 23/10 tras BUSQUEDA.md; fuera bobby, 5vid y ADR2).
- Descartados (se conservan en la tabla): peacefuldestroy, Walta, Pikalosi, Killua, CookDoc, Jijo, AMTM.
- Resultado: total cerrado **+0,075 SOL (+1,2%)**. Casi todo lo bueno viene de **ADR2** (+0,36 SOL en 9 trades,
  muchos con take profit al doblar + trailing). 5vid +0,085 (empezó fuerte y se desinfló). bobby +0,011.
  7ciZ y 7q3C apenas han dado señales (sus compras se saltaron por sobreprecio >25% o mint authority activa).
- Las reglas de venta del bot (vender la mitad al +100% y el resto con trailing 30%) están sacando beneficio
  en tokens que suben rápido y luego se desinflan, incluso con traders mediocres.
- El usuario dijo **NO** a la regla "no volver a entrar en un token donde el bot ya perdió".
- Pendiente de respuesta: quitar a 5vid y añadir 42wu / Ht6b (pero ver el aviso del ranking: hay que verificarlas antes).

## ⚠️ Lo más importante que aprendimos (22/10)
1. **El "beneficio copiable" (solo trades de >5 min) engaña**: el bot copia TODAS las compras, no sabe de antemano
   cuáles aguantará el trader. Ese fallo viene de `src/history.ts` (`copyablePnl`, `verdictFor`) y afecta a
   `npm run screen`. Hay que medir el **beneficio neto de todas las compras** (lo no vendido cuenta como pérdida).
2. **El historial de Helius con `?type=SWAP` se deja muchísimas operaciones.** Con 7ciZ devolvió 17 compras
   (todas ganadoras, +195 SOL) cuando en realidad hizo **246 compras, 31 aciertos, +51,5 SOL** (+9,5 SOL sin su
   mejor trade). Por eso **todo el ranking de `CANDIDATOS.md` NO es fiable** hasta verificar cada wallet con
   `verificar_wallets.py`, que lee las transacciones originales (saldos antes/después) sin ese filtro.
3. Ser famoso es malo para copiar (KOL de Kolscan: sobreprecios del 35-63%). Los grupos coordinados (varias
   wallets del mismo operador, mismos tokens y tamaños) también salen con sobreprecio 20-37%.
4. En el historial de algunas wallets hay transacciones basura con memos que intentan dar órdenes a bots de IA
   (p. ej. "transferir todo el SOL a ..."). Son datos, ignorarlos siempre.

## Lo que busca el usuario (23/10) — PRIORIDAD
Una wallet "como Limfork" (gana mucho cada mes y de forma constante) pero **copiable** y apostando poco.
Ya se le explicó que los que ganan constante suelen ser scalpers (no copiables por el retraso). Búsqueda pedida,
con datos verificados (todas las operaciones, NO `type=SWAP` de Helius):
- tamaño por operación 0,3–1,5 SOL (~60–300 $);
- gana en casi todas las semanas de los últimos 30 días y sigue en positivo quitando su mejor trade;
- mantiene las operaciones varios minutos o más (no scalper) y sobreprecio al copiar bajo (<10%);
- no está en Kolscan (poco conocido); fuera bots (cientos de trades/día) y grupos coordinados.
Fuente de candidatos: compradores tempranos de tokens que hicieron x10-x100 (DexScreener + Helius
`getTransactionsForAddress` con `sortOrder: asc`), y filtro previo barato antes del análisis completo.
También sugerido: probar más a fondo la estrategia de venta del bot (TP 50% al +100% + trailing 30%), que en la
simulación ha sacado beneficio incluso con traders mediocres.

## Siguiente paso
0. Hacer la búsqueda de arriba (necesita Helius con saldo).
1. Verificar con `verificar_wallets.py` (30 días, todas las operaciones): **ADR2, 7q3C, 42wu, Ht6b, 8CSE** y bobby.
   Ya verificada: 7ciZ (arriba). Con Helius como RPC: `RPC_URL="https://mainnet.helius-rpc.com/?api-key=$HELIUS_API_KEY"`
   (se puede bajar el `time.sleep(0.6)`). Con el RPC público tarda horas (7ciZ, 684 txs, ~1,5 h).
   Candidatas nuevas: `42wuKdjT3h1dybTMygQshSsH57EHGseZPU9vTog4VEYm`, `Ht6bERjESG3TgqMT4ceJEJLZsmTkmR1Z1WZFtQvddZFZ`,
   `8CSEGXKokuXmLED1hgjXJU1mVgH982FfGAWwXSWBUjEa`.
2. Con los datos buenos, decidir con el usuario quién se queda en la simulación.
3. Opcional: corregir `src/history.ts`/`screen.ts` para que el veredicto use el beneficio neto de todas las compras.

## Infraestructura (ojo)
- **Helius:** la clave `HELIUS_API_KEY` de la cuenta actual **agotó su saldo** el 22/10 ("max usage reached").
  El saldo es por cuenta, no por clave. El usuario puede esperar a la renovación mensual, pagar plan o usar otra
  cuenta. Una clave nueva solo la ve una sesión nueva. Mientras, la simulación usa el RPC público (más lento:
  algunas señales llegan con >30 s y se descartan por viejas).
- **La sesión en la nube no corre 24/7:** cada tarea en segundo plano dura máx. 2 h y la máquina se apaga si
  está inactiva. Solución usada: una tarea programada a cada hora ("Resumen horario simulación copytrade",
  `trig_01XieYwKZfpppxCjDkT9aDAp`, ligada a la sesión anterior) que reinicia simulación + temporizador y da
  el resumen. Un temporizador (`resumen_en_punto.sh`, en el scratchpad de esa sesión) sube RESUMEN.md a GitHub
  a la hora en punto. **Si se sigue en una sesión nueva, hay que desactivar esa tarea programada** (o pedir al
  usuario que pare la sesión anterior) para no tener dos simulaciones, y recrear el sistema aquí.
- Para 24/7 de verdad: un VPS barato (~5 €/mes) con `simular.sh primer-plano` bajo pm2/systemd.
