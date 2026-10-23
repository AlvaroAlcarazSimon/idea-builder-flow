# Búsqueda de wallets constantes y copiables (23/10/2026, ~12:00 hora de España)

**Datos verificados:** todas las transacciones de los últimos 30 días (Helius `getTransactionsForAddress`, sin el
filtro `type=SWAP`). Lo no vendido cuenta como pérdida. Scripts en `simulacion/buscar/` (ver al final).

## Cómo se buscó
1. **Tokens que se dispararon:** 19.396 graduaciones de pump.fun (2–21 días) → DexScreener → 93 con más de 0,5 M$ →
   quitados los falsos (capitalización/liquidez > 25 o sin volumen, p. ej. "USDF" de 514 M$ con 2 M$ de liquidez) → 45 tokens.
2. **Compradores:** los que compraron 0,2–2 SOL al principio (sin creador ni snipers de los primeros 3 s) y los que compraron
   justo después de graduarse (~70–100 k$) en tokens que luego pasaron de 1 M$ → 3.600 wallets.
3. **Filtro barato:** fuera bots (>120 tx/día), inactivas, Kolscan (580 wallets), tamaño fuera de rango y scalpers → 180 analizadas a fondo.
4. **Análisis completo** (30 días) y **copiabilidad** de las finalistas: sobreprecio (lo que pagan otros 4–15 s después
   frente a lo que pagó él) y grupos coordinados (otras wallets que compran los mismos tokens).

## Finalistas (ninguna está en Kolscan)

| Wallet | Compras/día | Apuesta típica | Neto 30 d | Sin su mejor | Sin sus 3 mejores | Aciertos | Aguanta (mediana) | <1 min | Sobreprecio | Por semanas (reciente →) |
|---|---|---|---|---|---|---|---|---|---|---|
| `7gmjcpamkRrWmsUhQqc9H4EKN4cADnQb8SwJdgRFEkui` | 19 | 1,3 SOL (77% en 0,3–1,5) | **+59,0** | +50,0 | **+35,1** | 26% | 4,8 min | 19% | **+3,7%** | +2,2 / +2,4 / +24,5 / +30,0 |
| `2Y8uSmX9WTcGvBgVMLDuRxwA7jX3vf99i5omPYNkjFyU` | 1,4 | 1,1 SOL | **+44,2** | +22,5 | +4,7 | 41% | 3,0 min | 28% | +6,0% (variable) | +2,5 / +11,0 / +3,6 / +27,1 |
| `95FNTS9vkuMWLHdDVAVfjsJx9swcL2ktJQmKuuCPa3Hg` | 4,9 | 1,0 SOL (90% en rango) | +9,9 | +7,4 | +3,9 | 51% | 2,4 min | 31% | +6,0% (a veces 27–54%) | +3,3 / +1,3 / +5,2 (20 días de historia) |
| `DKFbE1htaNe9A3HXEfJbenqvcfD7bkWyZd8TaNe8gqCw` | 9,6 | 0,26 SOL | +7,5 | +3,0 | −1,8 | 34% | **89 min** | 3% | **−4,4%** | +0,1 / −1,5 / +5,3 / +3,7 |

- **7gmjcpa es la mejor:** gana todas las semanas, sigue muy en positivo quitando sus 3 mejores trades, nadie le sigue
  (sobreprecio +3,7%) y no forma grupo con nadie. Pega: las 2 últimas semanas ha ganado mucho menos (+2 SOL cada una).
  Hace ~19 compras al día → con 0,3 SOL por copia el bot movería ~6 SOL al día.
- **2Y8uSmX:** pocas compras pero buenas; ojo, comparte 10 de sus 39 tokens con `2kzV9qdZ…` (que pierde −17 SOL):
  puede ser un grupo de llamadas o alguien que le sigue.
- **95FNTS9:** pequeña pero constante y muy disciplinada en tamaño; solo 20 días de historia.
- **DKFbE1h:** la más "copiable" (aguanta hora y media, compras incluso más baratas al copiar) pero gana poco y
  sin sus 3 mejores trades queda en −1,8.

## Descartadas en esta búsqueda
- **Grupo coordinado grande** (~18 wallets que compran los mismos 100+ tokens): `CDex5YWn…`, `5ncq48eb…`, `2Fu5nvqa…`,
  `4hHnz4p1…`, `9tqxfHYB…`, `CntBVFQ5…`, `F3qpUZkQ…`, `EbhU1Stf…`, `5konqhRH…`, `HRJohiMj…`, `GP9mukAJ…`, `hvUJEpdY…`, `7P5gbyWG…`… (muchas venden justo a los 60 min: bot).
- `A2XqEiR1…`/`BeEN5iWB…`/`4UwK5AE6…`: mismo operador, sobreprecio +65%. `9fKPr38w…`/`DwSFu9QC…`/`4Vq5RPgK…`: grupo, +14%.
- `Bvkazoz…`/`Bup46Fa…` (+156 SOL) y `696969Y…`: bots/scalpers (83–94% de trades de <1 min, 35–74 compras/día).
- Otros grupos con cifras idénticas: `CQozn65…` y 8 más (18 días, ~250 compras), `GbfM3AE…`/`GD12a1V…`/`AzQRrsN…`, etc.

## Verificación de las wallets de la simulación (mismo método, 30 días)

| Wallet | Neto 30 d | Sin su mejor | Por semanas (reciente →) | Comentario |
|---|---|---|---|---|
| 7ciZ | **+58,5** | +16,5 | +24,2 / −0,2 / −1,2 / +35,7 | Buena pero depende de pocos pelotazos (13% aciertos), aguanta ~1,7 h |
| 7q3C | +3,0 | +1,0 | +1,2 / +0,8 / −1,3 / +2,4 | Casi plana; 39% de trades <1 min |
| 5vid | −2,8 | −3,4 | +0,9 / −0,8 / −0,5 / −2,4 | Pierde; apuestas de 0,1 SOL |
| **ADR2** | **−72,7** | −140,9 | −10,5 / −125,1 / +62,9 | Lo que gana en la simulación no lo gana él: pierde mucho las 2 últimas semanas |
| big bags bobby | −97,2 | −133,5 | +48,1 / −11,1 / −42,4 / −91,8 | Pierde |
| 42wu | +24,1 | +9,1 | +34,3 / +26,2 / −0,8 / −35,5 | Scalper (58% <1 min, mediana 42 s): no copiable |
| Ht6b | −150,7 | −172,4 | −12,2 / −133,7 / −4,8 | Pierde mucho |
| 8CSE | −10,1 | −28,1 | +4,3 / −16,4 / +2,0 | Pierde y apuesta 3 SOL |

## Scripts (`simulacion/buscar/`, necesitan `HELIUS_API_KEY`)
`paso1_tokens.py` → `paso2_compradores.py` (y `DESDE=graduacion`) → `paso3_analizar.py <min_tokens> [ficheros]` →
`paso4_copiable.py <wallets>`. Usar `OUT_DIR=<carpeta>` con `kolscan_raw.txt` dentro (direcciones sacadas de kolscan.io/leaderboard).
Coste de esta búsqueda: ~5.400 llamadas a Helius.
