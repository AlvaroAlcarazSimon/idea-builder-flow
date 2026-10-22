"""Verifica wallets leyendo las transacciones originales (sin el filtro type=SWAP de Helius, que se deja operaciones).
Uso: RPC_URL=<rpc> [PAUSA=0.1] python3 simulacion/verificar_wallets.py <wallet1> <wallet2> ...   (30 días; lo no vendido cuenta como pérdida)
"""
import json, sys, time, urllib.request
import os
RPC=os.environ.get("RPC_URL","https://api.mainnet-beta.solana.com")
WSOL="So11111111111111111111111111111111111111112"
STABLE={"EPjFWdd5AufqSSqeM2qPLvGnyhpUE8KDqXj6zSZ5eBvf","Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}
def rpc(method, params):
    for i in range(12):
        try:
            r=urllib.request.Request(RPC,data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),headers={"content-type":"application/json"})
            d=json.load(urllib.request.urlopen(r,timeout=60))
            if "error" in d: raise Exception(d["error"])
            return d["result"]
        except Exception as e: time.sleep(min(2**i,20))
    return None
def verify(w, days=30):
    cut=time.time()-days*86400; sigs=[]; before=None
    while True:
        p={"limit":1000}; 
        if before: p["before"]=before
        r=rpc("getSignaturesForAddress",[w,p]); time.sleep(1)
        if r is None: raise SystemExit(f"{w}: el RPC no responde (¿límite o saldo agotado?)")
        if not r: break
        sigs+=[s for s in r if s["err"] is None and (s.get("blockTime") or 0)>=cut]
        before=r[-1]["signature"]
        if len(r)<1000 or (r[-1].get("blockTime") or 0)<cut: break
    toks={}; own=0; fees=0; kinds={}; fail=0; sol_out={}; sol_in={}
    for i,s in enumerate(sigs):
        tx=rpc("getTransaction",[s["signature"],{"encoding":"jsonParsed","maxSupportedTransactionVersion":0}])
        time.sleep(float(os.environ.get("PAUSA","0.6")))
        if not tx: fail+=1; continue
        keys=[k["pubkey"] for k in tx["transaction"]["message"]["accountKeys"]]
        if keys[0]!=w:
            kinds["de terceros"]=kinds.get("de terceros",0)+1
            continue
        own+=1
        m=tx["meta"]; j=keys.index(w)
        sol=(m["postBalances"][j]-m["preBalances"][j])/1e9
        def bal(lst):
            o={}
            for b in lst:
                if b.get("owner")==w: o[b["mint"]]=o.get(b["mint"],0)+float(b["uiTokenAmount"]["uiAmount"] or 0)
            return o
        pre,post=bal(m.get("preTokenBalances",[])),bal(m.get("postTokenBalances",[]))
        d={k:post.get(k,0)-pre.get(k,0) for k in set(pre)|set(post)}
        sol+=d.pop(WSOL,0)
        for k in STABLE: d.pop(k,None)
        d={k:v for k,v in d.items() if abs(v)>1e-9}
        if len(d)!=1:
            if not d and sol<-0.01:
                for ins in tx["transaction"]["message"]["instructions"]:
                    pi=ins.get("parsed") if isinstance(ins,dict) else None
                    if isinstance(pi,dict) and pi.get("type")=="transfer" and pi["info"].get("source")==w:
                        dst=pi["info"]["destination"]; sol_out[dst]=sol_out.get(dst,0)+pi["info"]["lamports"]/1e9
                k="envía SOL" if sol<-0.01 else ("recibe SOL" if sol>0.01 else "otras")
            else: k="varios tokens a la vez"
            kinds[k]=kinds.get(k,0)+1
            continue
        kinds["compra/venta"]=kinds.get("compra/venta",0)+1
        mint,q=next(iter(d.items()))
        t=toks.setdefault(mint,{"sp":0,"rc":0,"b":0,"s":0})
        if q>0 and sol<0: t["sp"]-=sol; t["b"]+=1
        elif q<0 and sol>0: t["rc"]+=sol; t["s"]+=1
    inw={k:v for k,v in toks.items() if v["b"]}
    sp=sum(v["sp"] for v in inw.values()); rc=sum(v["rc"] for v in inw.values())
    pn=sorted([v["rc"]-v["sp"] for v in inw.values()],reverse=True)
    return dict(w=w,txs=len(sigs),firmadas=own,compras=len(inw),gastado=round(sp,2),recuperado=round(rc,2),neto=round(rc-sp,2),
        aciertos=f"{sum(p>0 for p in pn)}/{len(pn)}",mejor3=[round(p,2) for p in pn[:3]],peor3=[round(p,2) for p in pn[-3:]],sin_vender=sum(1 for v in inw.values() if not v["s"]),tipos=kinds,fallidas=fail,envios_sol=sorted(((round(v,2),k) for k,v in sol_out.items()),reverse=True)[:5])
if __name__=="__main__":
    for w in sys.argv[1:]: print(json.dumps(verify(w)),flush=True)
