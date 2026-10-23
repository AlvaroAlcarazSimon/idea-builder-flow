"""Paso 1: tokens de pump.fun que se graduaron (ya ~x15) entre hace DIAS_MAX y DIAS_MIN días,
y que según DexScreener siguen valiendo mucho (MCAP_MIN). Salida: data/tokens.json"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from hel import txs, get_json, WSOL, CALLS

MIGRATION = "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"
DIAS_MIN, DIAS_MAX = float(os.environ.get("DIAS_MIN", 2)), float(os.environ.get("DIAS_MAX", 21))
MCAP_MIN = float(os.environ.get("MCAP_MIN", 500_000))
OUT = os.environ.get("OUT_DIR", "data")

now = time.time()
grads, tok = {}, None
while True:
    d, tok = txs(MIGRATION, limit=100, gte=now - DIAS_MAX * 86400, lt=now - DIAS_MIN * 86400, token=tok)
    for t in d:
        for b in t["meta"].get("postTokenBalances") or []:
            if b["mint"] != WSOL and b["mint"].endswith("pump"):
                grads.setdefault(b["mint"], t["blockTime"])
    print(f"graduaciones: {len(grads)}  llamadas: {CALLS['n']}", file=sys.stderr)
    if not tok or not d:
        break

mints = list(grads)
info = {}
for i in range(0, len(mints), 30):
    r = get_json("https://api.dexscreener.com/tokens/v1/solana/" + ",".join(mints[i:i + 30])) or []
    for p in r:
        m = p["baseToken"]["address"]
        mc = p.get("marketCap") or p.get("fdv") or 0
        if m in grads and mc > info.get(m, {}).get("mcap", 0):
            info[m] = {"mint": m, "sym": p["baseToken"].get("symbol"), "mcap": mc,
                       "liq": (p.get("liquidity") or {}).get("usd", 0),
                       "vol24": (p.get("volume") or {}).get("h24", 0), "graduado": grads[m]}
    time.sleep(0.3)
sel = sorted([v for v in info.values() if v["mcap"] >= MCAP_MIN], key=lambda v: -v["mcap"])
json.dump(sel, open(f"{OUT}/tokens.json", "w"), indent=1)
print(f"{len(grads)} graduados, {len(info)} con datos, {len(sel)} con mcap >= {MCAP_MIN:,.0f} $", file=sys.stderr)
for v in sel[:40]:
    print(f"{v['sym']:>12} {v['mcap']/1e6:8.2f} M$  liq {v['liq']/1e3:7.0f} k$  {time.strftime('%d/%m', time.gmtime(v['graduado']))}")
