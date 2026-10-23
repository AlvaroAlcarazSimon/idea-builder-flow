"""Paso 3: filtro barato + análisis completo de 30 días con TODAS las transacciones (no type=SWAP).
Uso: python3 paso3_analizar.py [min_tokens]   (wallets de data/compradores.json en >= min_tokens tokens)
Lo no vendido cuenta como pérdida. Caché por wallet en data/w/<wallet>.json. Salida: data/analisis.json"""
import json, os, statistics as st, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from hel import txs, all_txs, signer, deltas, CALLS, SinSaldo

OUT = os.environ.get("OUT_DIR", "data")
DIAS = 30
MAX_TX_DIA = 120  # más que esto = bot
os.makedirs(f"{OUT}/w", exist_ok=True)
kol = set(open(f"{OUT}/kolscan_raw.txt").read().split())


def prefiltro(w, now):
    """Con las 100 últimas transacciones completas: bots, inactivas, tamaño de apuesta y scalpers."""
    d, _ = txs(w, limit=100, gte=now - DIAS * 86400)
    if len(d) < 15:
        return {"descarte": "muy poca actividad"}
    if now - d[0]["blockTime"] > 3 * 86400:
        return {"descarte": "inactiva >3 días"}
    if len(d) == 100 and d[0]["blockTime"] - d[-1]["blockTime"] < 100 / MAX_TX_DIA * 86400:
        return {"descarte": "bot"}
    buys, sells, tam = {}, {}, []
    for t in reversed(d):
        if signer(t) != w:
            continue
        sol, dd = deltas(t, w)
        if len(dd) != 1:
            continue
        m, q = next(iter(dd.items()))
        if q > 0 and sol < 0:
            buys.setdefault(m, t["blockTime"]); tam.append(-sol)
        elif q < 0 and sol > 0 and m in buys:
            sells.setdefault(m, t["blockTime"] - buys[m])
    if len(tam) < 3:
        return {"descarte": "muy poca actividad"}
    if not 0.15 <= st.median(tam) <= 2.5:
        return {"descarte": f"tamaño ({st.median(tam):.2f} SOL)"}
    h = list(sells.values())
    if len(h) >= 5 and st.median(h) < 60:
        return {"descarte": "scalper"}
    return None


def prefiltro_firmas(w, now):
    d, tok = txs(w, limit=1000, full=False, gte=now - DIAS * 86400)
    if not d:
        return {"descarte": "sin actividad"}
    span = max(now - d[-1]["blockTime"], 3600) / 86400
    por_dia = len(d) / span if tok else len(d) / DIAS
    if por_dia > MAX_TX_DIA:
        return {"descarte": f"bot ({por_dia:.0f} tx/día)"}
    if now - d[0]["blockTime"] > 3 * 86400:
        return {"descarte": "inactiva >3 días"}
    if len(d) < 15:
        return {"descarte": "muy poca actividad"}
    return None


def analizar(w, now):
    cut = now - DIAS * 86400
    lista = all_txs(w, max_pages=60, limit=100, gte=cut)
    toks, tipos = {}, {}
    for t in lista:
        if signer(t) != w:
            tipos["de terceros"] = tipos.get("de terceros", 0) + 1
            continue
        sol, d = deltas(t, w)
        if len(d) != 1:
            k = "varios tokens" if d else ("envía SOL" if sol < -0.01 else "recibe SOL" if sol > 0.01 else "otras")
            tipos[k] = tipos.get(k, 0) + 1
            continue
        mint, q = next(iter(d.items()))
        x = toks.setdefault(mint, {"sp": 0, "rc": 0, "buys": [], "sells": []})
        if q > 0 and sol < 0:
            x["sp"] -= sol; x["buys"].append((t["blockTime"], -sol))
        elif q < 0 and sol > 0:
            x["rc"] += sol; x["sells"].append(t["blockTime"])
        else:
            continue
        tipos["compra/venta"] = tipos.get("compra/venta", 0) + 1
    inw = {m: x for m, x in toks.items() if x["buys"]}
    if not inw:
        return {"descarte": "sin compras"}
    pn = {m: x["rc"] - x["sp"] for m, x in inw.items()}
    orden = sorted(pn.values(), reverse=True)
    neto = sum(orden)
    tam = [b[1] for x in inw.values() for b in x["buys"]]
    holds = []
    for x in inw.values():
        b0 = min(b[0] for b in x["buys"])
        s = [s for s in x["sells"] if s >= b0]
        if s:
            holds.append(min(s) - b0)
    semanas = [0.0] * 4
    for m, x in inw.items():
        k = int((now - min(b[0] for b in x["buys"])) // (7 * 86400))
        semanas[min(k, 3)] += pn[m]
    dias_act = max((now - min(b[0] for x in inw.values() for b in x["buys"])) / 86400, 1)
    return {
        "compras": len(inw), "compras_dia": round(len(inw) / dias_act, 1), "dias_historia": round(dias_act, 1),
        "gastado": round(sum(x["sp"] for x in inw.values()), 2), "neto": round(neto, 2),
        "sin_mejor": round(neto - orden[0], 2), "sin_mejor3": round(neto - sum(orden[:3]), 2),
        "aciertos": round(sum(p > 0 for p in orden) / len(orden), 2),
        "mejor3": [round(p, 2) for p in orden[:3]], "peor3": [round(p, 2) for p in orden[-3:]],
        "tam_mediana": round(st.median(tam), 3), "tam_en_rango": round(sum(0.3 <= s <= 1.5 for s in tam) / len(tam), 2),
        "hold_mediana_min": round(st.median(holds) / 60, 1) if holds else None,
        "hold_menos_1min": round(sum(h < 60 for h in holds) / len(holds), 2) if holds else None,
        "sin_vender": sum(1 for x in inw.values() if not x["sells"]),
        "semanas": [round(s, 2) for s in semanas], "txs": len(lista), "tipos": tipos,
        "pnl_por_token": {m: round(p, 3) for m, p in pn.items()},
        "compras_detalle": {m: x["buys"][:3] for m, x in inw.items()},
    }


if __name__ == "__main__":
    min_tok = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    comp = {}
    for f in sys.argv[2:] or ["compradores.json"]:
        for w, x in json.load(open(f"{OUT}/{f}")).items():
            comp.setdefault(w, []).extend(x)
    ws = [w for w, x in comp.items() if len({y["mint"] for y in x}) >= min_tok]
    print(f"{len(ws)} wallets a revisar", file=sys.stderr)
    now = time.time()
    res = {}
    try:
        for i, w in enumerate(ws):
            f = f"{OUT}/w/{w}.json"
            if os.path.exists(f):
                res[w] = json.load(open(f)); continue
            if w in kol:
                r = {"descarte": "en Kolscan"}
            else:
                r = prefiltro(w, now) or analizar(w, now)
            r["w"] = w
            json.dump(r, open(f, "w"))
            res[w] = r
            if i % 10 == 0:
                print(f"{i}/{len(ws)}  llamadas {CALLS['n']}", file=sys.stderr, flush=True)
    except SinSaldo as e:
        print("Helius sin saldo:", e, file=sys.stderr)
    todo = {}
    for f in os.listdir(f"{OUT}/w"):
        r = json.load(open(f"{OUT}/w/{f}")); todo[r["w"]] = r
    json.dump(todo, open(f"{OUT}/analisis.json", "w"))
    desc = {}
    for r in res.values():
        if "descarte" in r:
            k = r["descarte"].split(" (")[0]; desc[k] = desc.get(k, 0) + 1
    print("descartes:", desc, " analizadas:", sum("neto" in r for r in res.values()), " llamadas:", CALLS["n"], file=sys.stderr)
