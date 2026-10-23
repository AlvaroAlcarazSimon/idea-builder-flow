"""Paso 4 (finalistas): sobreprecio al copiar y grupos coordinados.
Sobreprecio: para sus últimas N compras, precio medio que pagan otros entre 4 y 15 s después frente al suyo.
Grupo: otras wallets analizadas que compran muchos de sus mismos tokens.
Uso: python3 paso4_copiable.py <wallet> ...   Salida: data/copiable.json"""
import json, os, statistics as st, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from hel import txs, signer, deltas, CALLS

OUT = os.environ.get("OUT_DIR", "data")
N = int(os.environ.get("N_COMPRAS", 12))


def sobreprecio(w):
    lista, tok = [], None
    compras = []
    for _ in range(4):
        d, tok = txs(w, limit=100, token=tok)
        for t in d:
            if signer(t) != w:
                continue
            sol, dd = deltas(t, w)
            if len(dd) == 1:
                m, q = next(iter(dd.items()))
                if q > 0 and sol < -0.05:
                    compras.append((t["blockTime"], m, -sol / q))
        if len(compras) >= N or not tok:
            break
    out = []
    for bt, m, p in compras[:N]:
        d, _ = txs(m, limit=100, asc=True, gte=bt + 4, lt=bt + 16)
        precios = []
        for t in d:
            s = signer(t)
            if s == w:
                continue
            sol, dd = deltas(t, s)
            q = dd.get(m, 0)
            if q > 0 and sol < -0.01:
                precios.append(-sol / q)
        if precios:
            out.append(st.median(precios) / p - 1)
    return out


if __name__ == "__main__":
    an = json.load(open(f"{OUT}/analisis.json"))
    res = json.load(open(f"{OUT}/copiable.json")) if os.path.exists(f"{OUT}/copiable.json") else {}
    for w in sys.argv[1:]:
        sp = sobreprecio(w)
        mios = set(an.get(w, {}).get("pnl_por_token", {}))
        grupo = []
        for o, r in an.items():
            if o == w or "pnl_por_token" not in r:
                continue
            comun = mios & set(r["pnl_por_token"])
            if len(comun) >= 5 and len(comun) >= 0.3 * min(len(mios), len(r["pnl_por_token"])):
                grupo.append((o[:8], len(comun)))
        res[w] = {"sobreprecio_mediana": round(st.median(sp) * 100, 1) if sp else None,
                  "sobreprecios": [round(x * 100, 1) for x in sp], "grupo": grupo}
        print(w[:8], res[w], f"(llamadas {CALLS['n']})", flush=True)
    json.dump(res, open(f"{OUT}/copiable.json", "w"))
