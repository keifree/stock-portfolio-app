export interface StockFullProfile {
  currentPrice: number;
  previousPrice: number;
  price5DaysAgo: number;
  price20DaysAgo: number;
  priceYearStart: number;
  adoptPrice?: number;
  marketCap?: number;
}

function formatSymbol(code: string): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  
  if (upper.includes("N225") || upper.includes("NI222") || upper.includes("NI225") || upper.includes("NIKKEI")) {
    return "^N225";
  }
  if (upper.includes("TOPX") || upper.includes("TOPIX") || upper.includes("998405")) {
    return "998405.T";
  }
  
  if (!upper.endsWith(".T") && !upper.startsWith("^")) {
    return upper + ".T";
  }
  return upper;
}

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
];

async function fetchViaProxy(targetUrl: string): Promise<any> {
  let lastError: any = null;
  
  for (const proxyFn of CORS_PROXIES) {
    try {
      const url = proxyFn(targetUrl);
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return await res.json();
        }
      }
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error("All CORS proxies failed");
}

/**
 * 日本株の指定日の株価を取得するカスタム関数（GASのGET_JP_STOCK_DATE_PRICEと完全同一ロジック）
 * 採用日がどれだけ古くても（2025年1月4日等）、ピンポイントでその前後期間のタイムスタンプを指定して確実に取得します。
 */
export async function fetchJpStockDatePrice(code: string, targetDateStr: string): Promise<number | null> {
  if (!code || !targetDateStr) return null;
  const sym = formatSymbol(code);
  
  try {
    const d = new Date(targetDateStr);
    if (isNaN(d.getTime())) return null;
    
    // 指定日の23:59:59タイムスタンプを基準（GASと完全一致）
    d.setHours(23, 59, 59, 999);
    const targetSec = Math.floor(d.getTime() / 1000);
    
    // 指定日の前15日間・後2日間のデータ範囲（年末年始連休・大型連休・土日祝日をカバー）
    const period1 = targetSec - 86400 * 15;
    const period2 = targetSec + 86400 * 2;
    
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${period1}&period2=${period2}&interval=1d`;
    const json = await fetchViaProxy(targetUrl);
    
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    
    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0]?.close;
    if (!timestamps || !quotes) return null;
    
    let lastValidPrice: number | null = null;
    let maxTimestampBeforeTarget = -1;
    
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const price = quotes[i];
      
      if (price !== null && price !== undefined && !isNaN(price)) {
        // 指定日以前の中で最も最新の営業日を取得（GASと完全一致）
        if (ts <= targetSec) {
          if (ts > maxTimestampBeforeTarget) {
            maxTimestampBeforeTarget = ts;
            lastValidPrice = price;
          }
        }
      }
    }
    
    if (lastValidPrice !== null) {
      return Math.round(lastValidPrice * 100) / 100;
    }
  } catch (e) {
    console.error(`fetchJpStockDatePrice failed for date: ${targetDateStr}`, e);
  }
  return null;
}

/**
 * 日本株の「年初株価（年初大発会等最初営業日）」を取得する関数
 */
export async function fetchJpStockYearStartPrice(code: string): Promise<number | null> {
  if (!code) return null;
  const sym = formatSymbol(code);
  
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=ytd&interval=1d`;
    const json = await fetchViaProxy(targetUrl);
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    
    const quotes = result.indicators?.quote?.[0]?.close;
    if (!quotes) return null;
    
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i] !== null && quotes[i] !== undefined && !isNaN(quotes[i])) {
        return Math.round(quotes[i] * 100) / 100;
      }
    }
  } catch (e) {
    console.error("fetchJpStockYearStartPrice failed:", e);
  }
  return null;
}

/**
 * 最新株価、前日、5日前、20日前、年始、および任意の採用日（古くても可）の終値を全網羅で取得する
 */
export async function fetchJpStockFullProfile(code: string, adoptDateStr?: string): Promise<StockFullProfile | null> {
  if (!code) return null;
  const sym = formatSymbol(code);
  
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`;
    const json = await fetchViaProxy(targetUrl);
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0]?.close;
    
    const validQuotes: number[] = [];
    if (Array.isArray(quotes)) {
      for (let i = 0; i < quotes.length; i++) {
        const q = quotes[i];
        if (q !== null && q !== undefined && !isNaN(q) && q > 0) {
          validQuotes.push(q);
        }
      }
    }
    
    // 1. 最新営業日確定価格 (8/6大引け値など) の確定
    let currentPrice = meta?.regularMarketPrice;
    let isMetaValid = false;

    if (currentPrice && currentPrice > 0) {
      isMetaValid = true;
      currentPrice = Math.round(currentPrice * 100) / 100;
    } else if (validQuotes.length > 0) {
      currentPrice = Math.round(validQuotes[validQuotes.length - 1] * 100) / 100;
    } else {
      return null;
    }

    // 2. 前営業日確定終値 (8/5引け値など) の確定
    let previousPrice = 0;
    if (isMetaValid && validQuotes.length > 0) {
      const lastQuote = Math.round(validQuotes[validQuotes.length - 1] * 100) / 100;
      if (Math.abs(lastQuote - currentPrice) > 0.01) {
        previousPrice = lastQuote;
      } else if (validQuotes.length >= 2) {
        previousPrice = Math.round(validQuotes[validQuotes.length - 2] * 100) / 100;
      } else {
        previousPrice = currentPrice;
      }
    } else if (validQuotes.length >= 2) {
      previousPrice = Math.round(validQuotes[validQuotes.length - 2] * 100) / 100;
    } else {
      previousPrice = currentPrice;
    }

    // 3. 5営業日前、20営業日前価格の確実な遡及算出
    const offset = (isMetaValid && validQuotes.length > 0 && Math.abs(validQuotes[validQuotes.length - 1] - currentPrice) > 0.01) ? 1 : 0;
    
    const idx5 = validQuotes.length - 5 - offset;
    const price5DaysAgo = idx5 >= 0 
      ? Math.round(validQuotes[idx5] * 100) / 100 
      : previousPrice;

    const idx20 = validQuotes.length - 20 - offset;
    const price20DaysAgo = idx20 >= 0 
      ? Math.round(validQuotes[idx20] * 100) / 100 
      : previousPrice;

    // 年始価格
    let priceYearStart = price20DaysAgo;
    const ytdPrice = await fetchJpStockYearStartPrice(code);
    if (ytdPrice !== null && ytdPrice > 0) {
      priceYearStart = ytdPrice;
    }

    // 採用日価格
    let adoptPrice = undefined;
    if (adoptDateStr) {
      const datePrice = await fetchJpStockDatePrice(code, adoptDateStr);
      if (datePrice !== null && datePrice > 0) {
        adoptPrice = datePrice;
      }
    }

    // 時価総額 (億円) の取得
    const marketCap = await fetchJpStockMarketCap(code);

    return {
      currentPrice,
      previousPrice,
      price5DaysAgo,
      price20DaysAgo,
      priceYearStart,
      adoptPrice,
      marketCap: marketCap || undefined
    };
  } catch (e) {
    console.error(`fetchJpStockFullProfile failed for code: ${code}`, e);
  }
  return null;
}

export async function fetchJpStockMarketCap(code: string): Promise<number | null> {
  if (!code) return null;
  const cleanCode = code.replace('.T', '').trim();
  const targetUrl = `https://finance.yahoo.co.jp/quote/${cleanCode}.T`;
  
  try {
    const rawText = await fetchViaProxy(targetUrl);
    if (typeof rawText === 'string') {
      const match = rawText.match(/時価総額[\s\S]*?_StyledNumber__value[^>]*?>([\d,]+)<\/span>/);
      if (match && match[1]) {
        const rawHyakuman = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(rawHyakuman) && rawHyakuman > 0) {
          return Math.round(rawHyakuman / 100);
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function GET_JP_STOCK_CAP_SIZE(code: string): "大型株" | "中型株" | "小型株" | "市場指標" {
  if (!code) return "中型株";
  const sym = formatSymbol(code);
  if (sym === "^N225" || sym === "998405.T") return "市場指標";

  const c = code.replace(".T", "").trim();

  const largeCapSet: Record<string, boolean> = {
    "1605": true, "1802": true, "1942": true, "4004": true, "4062": true,
    "5802": true, "6146": true, "6269": true, "6525": true, "6728": true,
    "6758": true, "6841": true, "6861": true, "6920": true, "7453": true,
    "8306": true, "8766": true
  };

  const smallCapSet: Record<string, boolean> = {
    "4369": true
  };

  if (largeCapSet[c]) return "大型株";
  if (smallCapSet[c]) return "小型株";

  return "中型株";
}
