"""Paso 2: compradores tempranos (primeras ~PAGINAS*100 transacciones) de los tokens de data/tokens.json.
Fuera: el creador, compras en los primeros 3 s (snipers/bundles) y compras fuera de 0,2-2 SOL.
Con DESDE=graduacion: compradores desde que el token se graduó (~70-100 k$), solo tokens >= 1 M$.
Salida: data/compradores.json (o data/compradores_grad.json)  {wallet: [{mint, sym, sol, seg_desde_creacion}]}"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from hel import txs, signer, deltas, CALLS

OUT = os.environ.get("OUT_DIR", "data")
PAGINAS = int(os.environ.get("PAGINAS", 6))
MIN_SOL, MAX_SOL = 0.2, 2.0
GRAD = os.environ.get("DESDE") == "graduacion"

tokens = [v for v in json.load(open(f"{OUT}/tokens.json"))
          if v["mcap"] / max(v["liq"], 1) < 25 and v["vol24"] > 20000 and (not GRAD or v["mcap"] >= 1e6)]
compradores, resumen = {}, []
for v in tokens:
    lista, tok = [], None
    for _ in range(PAGINAS):
        d, tok = txs(v["mint"], limit=100, asc=True, token=tok, gte=v["graduado"] if GRAD else None)
        lista += d
        if not tok or not d:
            break
    if not lista:
        continue
    t0, creador = lista[0]["blockTime"], signer(lista[0])
    firmantes, n = set(), 0
    for t in lista:
        w = signer(t)
        firmantes.add(w)
        if w == creador or (not GRAD and t["blockTime"] - t0 < 3):
            continue
        sol, d = deltas(t, w)
        if d.get(v["mint"], 0) > 0 and -MAX_SOL <= sol <= -MIN_SOL:
            compradores.setdefault(w, []).append({"mint": v["mint"], "sym": v["sym"], "sol": round(-sol, 3),
                                                  "seg": t["blockTime"] - t0})
            n += 1
    resumen.append((v["sym"], len(lista), len(firmantes), n, round((lista[-1]["blockTime"] - t0) / 60)))
    print(f"{v['sym']:>10}: {len(lista)} txs, {len(firmantes)} firmantes, {n} compras válidas, "
          f"cubre {resumen[-1][-1]} min  (llamadas {CALLS['n']})", file=sys.stderr, flush=True)
json.dump(compradores, open(f"{OUT}/compradores{'_grad' if GRAD else ''}.json", "w"))
rep = sorted(compradores.items(), key=lambda kv: -len({x['mint'] for x in kv[1]}))
print(f"{len(compradores)} wallets; en >=2 tokens: {sum(1 for k, x in rep if len({y['mint'] for y in x}) >= 2)}", file=sys.stderr)
