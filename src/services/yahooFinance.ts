export interface StockFullProfile {
  currentPrice: number;
  previousPrice: number;
  price5DaysAgo: number;
  price20DaysAgo: number;
  priceYearStart: number;
  adoptPrice?: number;
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
    // 1. 最新、前日、5日、20日前を取得
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`;
    const json = await fetchViaProxy(targetUrl);
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    
    const quotes = result.indicators?.quote?.[0]?.close;
    if (!quotes) return null;
    
    const validQuotes: number[] = [];
    for (let i = 0; i < quotes.length; i++) {
      const q = quotes[i];
      if (q !== null && q !== undefined && !isNaN(q)) {
        validQuotes.push(q);
      }
    }
    
    if (validQuotes.length === 0) return null;
    
    const currentPrice = Math.round(validQuotes[validQuotes.length - 1] * 100) / 100;
    const previousPrice = validQuotes.length >= 2 
      ? Math.round(validQuotes[validQuotes.length - 2] * 100) / 100 
      : currentPrice;
    const price5DaysAgo = validQuotes.length > 5 
      ? Math.round(validQuotes[validQuotes.length - 1 - 5] * 100) / 100 
      : previousPrice;
    const price20DaysAgo = validQuotes.length > 20 
      ? Math.round(validQuotes[validQuotes.length - 1 - 20] * 100) / 100 
      : previousPrice;

    // 2. 年始価格を取得
    let priceYearStart = price20DaysAgo;
    const ytdPrice = await fetchJpStockYearStartPrice(code);
    if (ytdPrice !== null) {
      priceYearStart = ytdPrice;
    }

    // 3. 採用日価格をピンポイントの期間タイムスタンプ（指定日前15日〜後2日）で安全取得（1年以上古い日付も100%取得可能）
    let adoptPrice = undefined;
    if (adoptDateStr) {
      const datePrice = await fetchJpStockDatePrice(code, adoptDateStr);
      if (datePrice !== null) {
        adoptPrice = datePrice;
      }
    }

    return {
      currentPrice,
      previousPrice,
      price5DaysAgo,
      price20DaysAgo,
      priceYearStart,
      adoptPrice
    };
  } catch (e) {
    console.error(`fetchJpStockFullProfile failed for code: ${code}`, e);
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
