"""Utilidades comunes para la búsqueda de wallets (Helius + DexScreener)."""
import json, os, time, urllib.request

KEY = os.environ.get("HELIUS_API_KEY", "")
RPC = os.environ.get("RPC_URL") or f"https://mainnet.helius-rpc.com/?api-key={KEY}"
WSOL = "So11111111111111111111111111111111111111112"
STABLE = {"EPjFWdd5AufqSSqeM2qPLvGnyhpUE8KDqXj6zSZ5eBvf", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}
CALLS = {"n": 0}


class SinSaldo(Exception):
    pass


def rpc(method, params, tries=8):
    for i in range(tries):
        try:
            CALLS["n"] += 1
            r = urllib.request.Request(RPC, data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
                                       headers={"content-type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=90))
            if "error" in d:
                if "max usage" in json.dumps(d["error"]).lower():
                    raise SinSaldo(d["error"])
                raise Exception(d["error"])
            return d["result"]
        except SinSaldo:
            raise
        except Exception as e:
            if "max usage" in str(e).lower():
                raise SinSaldo(str(e))
            time.sleep(min(2 ** i, 20))
    return None


def txs(address, limit=100, asc=False, full=True, gte=None, lt=None, token=None):
    """Una página de getTransactionsForAddress. Devuelve (lista, paginationToken)."""
    p = {"limit": limit, "sortOrder": "asc" if asc else "desc",
         "transactionDetails": "full" if full else "signatures"}
    if full:
        p.update(encoding="jsonParsed", maxSupportedTransactionVersion=1)
    f = {"status": "succeeded"}
    bt = {}
    if gte: bt["gte"] = int(gte)
    if lt: bt["lt"] = int(lt)
    if bt: f["blockTime"] = bt
    p["filters"] = f
    if token: p["paginationToken"] = token
    r = rpc("getTransactionsForAddress", [address, p])
    if not r:
        return [], None
    return r.get("data", []), r.get("paginationToken")


def all_txs(address, max_pages=50, **kw):
    out, tok = [], None
    for _ in range(max_pages):
        d, tok = txs(address, token=tok, **kw)
        out += d
        if not tok or not d:
            break
    return out


def signer(tx):
    k = tx["transaction"]["message"]["accountKeys"][0]
    return k["pubkey"] if isinstance(k, dict) else k


def deltas(tx, w):
    """Cambio de SOL (incluye wSOL) y de tokens de la wallet w en la transacción."""
    m = tx["meta"]
    keys = [k["pubkey"] if isinstance(k, dict) else k for k in tx["transaction"]["message"]["accountKeys"]]
    sol = 0.0
    if w in keys:
        j = keys.index(w)
        sol = (m["postBalances"][j] - m["preBalances"][j]) / 1e9

    def bal(lst):
        o = {}
        for b in lst or []:
            if b.get("owner") == w:
                o[b["mint"]] = o.get(b["mint"], 0) + float(b["uiTokenAmount"]["uiAmount"] or 0)
        return o
    pre, post = bal(m.get("preTokenBalances")), bal(m.get("postTokenBalances"))
    d = {k: post.get(k, 0) - pre.get(k, 0) for k in set(pre) | set(post)}
    sol += d.pop(WSOL, 0)
    for k in STABLE:
        d.pop(k, None)
    return sol, {k: v for k, v in d.items() if abs(v) > 1e-9}


def get_json(url):
    for i in range(5):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"user-agent": "Mozilla/5.0"}), timeout=30))
        except Exception:
            time.sleep(2 + 2 * i)
    return None
