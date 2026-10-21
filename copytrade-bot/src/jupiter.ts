import { config } from "./config.js";

export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  slippageBps: number;
  routePlan: unknown[];
  [k: string]: unknown;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (config.jupiterApiKey) h["x-api-key"] = config.jupiterApiKey;
  return h;
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const res = await fetch(url, { ...init, headers: headers(), signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Jupiter ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export async function getQuote(inputMint: string, outputMint: string, amountRaw: bigint, slippageBps: number): Promise<QuoteResponse> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountRaw.toString(),
    slippageBps: String(slippageBps),
    restrictIntermediateTokens: "true",
  });
  const quote = await fetchJson<QuoteResponse & { error?: string }>(`${config.jupiterApiUrl}/quote?${params}`);
  if (quote.error || !quote.outAmount) throw new Error(`Sin ruta en Jupiter: ${quote.error ?? "respuesta vacía"}`);
  return quote;
}

export async function getSwapTransaction(quote: QuoteResponse, userPublicKey: string): Promise<SwapResponse> {
  return fetchJson<SwapResponse>(`${config.jupiterApiUrl}/swap`, {
    method: "POST",
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: config.priorityFeeMaxLamports,
          priorityLevel: config.priorityLevel,
        },
      },
    }),
  });
}
