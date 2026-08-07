import { calculateDynamicMarketCap } from './tseMaster';

export interface StockFullProfile {
  currentPrice: number;
  previousPrice: number;
  price5DaysAgo: number;
  price20DaysAgo: number;
  priceYearStart: number;
  adoptPrice?: number;
  marketCap?: number;
}

export interface MarketReferenceDates {
  currentDate: string;  // 例: "2026-08-07"
  prev1Date: string;    // 例: "2026-08-06"
  prev5Date: string;    // 例: "2026-07-31"
  prev20Date: string;   // 例: "2026-07-09"
  yearStartDate: string;// 例: "2026-01-05"
}

export interface MarketIndexMetrics {
  name: string;
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  changePrevVal: number;
  changePrevPct: number;
  price5DaysAgo: number;
  change5dVal: number;
  change5dPct: number;
  price20DaysAgo: number;
  change20dVal: number;
  change20dPct: number;
  priceYearStart: number;
  changeYtdVal: number;
  changeYtdPct: number;
}

function formatSymbol(code: string): string {
  if (!code) return '';
  const upper = code.trim().toUpperCase();

  if (upper.includes('N225') || upper.includes('NI225') || upper.includes('NIKKEI')) {
    return '^N225';
  }
  if (upper.includes('TOPX') || upper.includes('TOPIX') || upper.includes('998405')) {
    return '1306.T'; // TOPIX連動型ETF (1306.T)
  }

  // 銘柄コード文字列から確実に4桁数字を優先抽出
  const digitMatch = upper.match(/(\d{4})/);
  if (digitMatch) {
    return `${digitMatch[1]}.T`;
  }

  if (!upper.endsWith('.T') && !upper.startsWith('^')) {
    return `${upper}.T`;
  }
  return upper;
}

const PROXIES = [
  // 1. ダイレクト通信 (最優先)
  async (url: string, signal: AbortSignal) => {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) return await res.json();
    throw new Error(`Direct fetch status ${res.status}`);
  },
  // 2. AllOrigins get JSON
  async (url: string, signal: AbortSignal) => {
    const cb = `_t=${Date.now()}&cb=${Math.random().toString(36).substring(2)}`;
    const pUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&${cb}`;
    const res = await fetch(pUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      return typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
    }
    throw new Error(`AllOrigins get status ${res.status}`);
  },
  // 3. AllOrigins raw
  async (url: string, signal: AbortSignal) => {
    const cb = `_t=${Date.now()}&cb=${Math.random().toString(36).substring(2)}`;
    const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&${cb}`;
    const res = await fetch(pUrl, { signal });
    if (res.ok) return await res.json();
    throw new Error(`AllOrigins raw status ${res.status}`);
  },
  // 4. CorsProxy io
  async (url: string, signal: AbortSignal) => {
    const cb = `_t=${Date.now()}&cb=${Math.random().toString(36).substring(2)}`;
    const pUrl = `https://corsproxy.io/?${encodeURIComponent(url)}&${cb}`;
    const res = await fetch(pUrl, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) return await res.json();
    throw new Error(`CorsProxy status ${res.status}`);
  }
];

export async function fetchWithResilience(targetUrl: string, timeoutMs: number = 2500): Promise<any> {
  for (const proxyFn of PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const data = await proxyFn(targetUrl, controller.signal).finally(() => clearTimeout(timer));
      if (data && data.chart && data.chart.result) {
        return data;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function getMarketReferenceDatesFromChart(result: any): MarketReferenceDates | null {
  const timestamps: number[] = result?.timestamp || [];
  const quotes: number[] = result?.indicators?.quote?.[0]?.close || [];
  const validDates: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const q = quotes[i];
    if (q !== null && q !== undefined && !isNaN(q) && q > 0) {
      const d = new Date(timestamps[i] * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      validDates.push(`${yyyy}-${mm}-${dd}`);
    }
  }

  const n = validDates.length;
  if (n === 0) return null;

  const currentDate = validDates[n - 1];
  const prev1Date = n >= 2 ? validDates[n - 2] : currentDate;
  const prev5Date = n >= 6 ? validDates[n - 6] : prev1Date;
  const prev20Date = n >= 21 ? validDates[n - 21] : prev1Date;

  const currentYear = new Date().getFullYear();
  const ytdDate = validDates.find(d => d.startsWith(`${currentYear}-`)) || validDates[0];

  return {
    currentDate,
    prev1Date,
    prev5Date,
    prev20Date,
    yearStartDate: ytdDate
  };
}

/**
 * 指定日の株価を個別取得するカスタム関数
 */
export async function fetchJpStockDatePrice(code: string, targetDateStr: string): Promise<number | null> {
  if (!code || !targetDateStr) return null;
  const sym = formatSymbol(code);

  try {
    const d = new Date(targetDateStr);
    if (isNaN(d.getTime())) return null;

    d.setHours(23, 59, 59, 999);
    const targetSec = Math.floor(d.getTime() / 1000);

    const period1 = targetSec - 86400 * 15;
    const period2 = targetSec + 86400 * 2;

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${period1}&period2=${period2}&interval=1d&_t=${Date.now()}`;
    const json = await fetchWithResilience(targetUrl, 2500);

    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const quotes: number[] = result.indicators?.quote?.[0]?.close || [];
    if (!timestamps.length || !quotes.length) return null;

    let lastValidPrice: number | null = null;
    let maxTimestampBeforeTarget = -1;

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const price = quotes[i];

      if (price !== null && price !== undefined && !isNaN(price)) {
        if (ts <= targetSec && ts > maxTimestampBeforeTarget) {
          maxTimestampBeforeTarget = ts;
          lastValidPrice = price;
        }
      }
    }

    if (lastValidPrice !== null) {
      return Math.round(lastValidPrice * 100) / 100;
    }
  } catch (e) {
    console.error(`fetchJpStockDatePrice failed for code: ${code}, date: ${targetDateStr}`, e);
  }
  return null;
}

/**
 * 統一カレンダー市場日付で株価指標を取得する
 */
export async function fetchJpStockFullProfile(
  code: string,
  adoptDateStr?: string,
  refDates?: MarketReferenceDates
): Promise<StockFullProfile | null> {
  if (!code) return null;
  const sym = formatSymbol(code);

  try {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d&_t=${Date.now()}`;
    const json = await fetchWithResilience(targetUrl, 2500);
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const quotes: number[] = result.indicators?.quote?.[0]?.close || [];

    const dateMap = new Map<string, number>();
    const dateList: string[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const q = quotes[i];
      if (q !== null && q !== undefined && !isNaN(q) && q > 0) {
        const d = new Date(timestamps[i] * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        dateMap.set(dateStr, Math.round(q * 100) / 100);
        dateList.push(dateStr);
      }
    }

    if (dateList.length === 0) return null;

    const getPriceForDate = (targetDate?: string) => {
      if (!targetDate) return dateMap.get(dateList[dateList.length - 1]) || 0;
      if (dateMap.has(targetDate)) return dateMap.get(targetDate)!;
      const available = dateList.filter(d => d <= targetDate);
      if (available.length > 0) {
        return dateMap.get(available[available.length - 1])!;
      }
      return dateMap.get(dateList[dateList.length - 1]) || 0;
    };

    let currentPrice = 0;
    let previousPrice = 0;
    let price5DaysAgo = 0;
    let price20DaysAgo = 0;
    let priceYearStart = 0;

    if (refDates) {
      currentPrice = getPriceForDate(refDates.currentDate);
      previousPrice = getPriceForDate(refDates.prev1Date);
      price5DaysAgo = getPriceForDate(refDates.prev5Date);
      price20DaysAgo = getPriceForDate(refDates.prev20Date);
      priceYearStart = getPriceForDate(refDates.yearStartDate);
    } else {
      const n = dateList.length;
      currentPrice = dateMap.get(dateList[n - 1])!;
      previousPrice = n >= 2 ? dateMap.get(dateList[n - 2])! : currentPrice;
      price5DaysAgo = n >= 6 ? dateMap.get(dateList[n - 6])! : previousPrice;
      price20DaysAgo = n >= 21 ? dateMap.get(dateList[n - 21])! : previousPrice;
      priceYearStart = dateMap.get(dateList[0])!;
    }

    let adoptPrice: number | undefined = undefined;
    if (adoptDateStr) {
      try {
        const cleanAdoptStr = adoptDateStr.replace(/\//g, '-');
        const adoptLookup = dateList.filter(d => d <= cleanAdoptStr).pop();
        if (adoptLookup) {
          adoptPrice = dateMap.get(adoptLookup);
        } else {
          const datePrice = await fetchJpStockDatePrice(code, adoptDateStr);
          if (datePrice !== null && datePrice > 0) {
            adoptPrice = datePrice;
          }
        }
      } catch (adoptErr) {
        console.warn(`adoptPrice fetch warning for code: ${code}`, adoptErr);
      }
    }

    const calcCap = calculateDynamicMarketCap(code, currentPrice);
    const marketCap = calcCap > 0 ? calcCap : undefined;

    return {
      currentPrice,
      previousPrice,
      price5DaysAgo,
      price20DaysAgo,
      priceYearStart,
      adoptPrice,
      marketCap
    };
  } catch (e) {
    console.error(`fetchJpStockFullProfile failed for code: ${code}`, e);
  }
  return null;
}

export function GET_JP_STOCK_CAP_SIZE(code: string): '大型株' | '中型株' | '小型株' | '市場指標' {
  if (!code) return '中型株';
  const sym = formatSymbol(code);
  if (sym === '^N225' || sym === '1306.T' || sym === '998405.T') return '市場指標';

  const c = code.replace('.T', '').trim();
  const largeCapSet: Record<string, boolean> = {
    '1605': true, '1802': true, '1942': true, '4004': true, '4062': true,
    '5802': true, '6146': true, '6269': true, '6525': true, '6728': true,
    '6758': true, '6841': true, '6861': true, '6920': true, '7453': true,
    '8306': true, '8766': true
  };

  const smallCapSet: Record<string, boolean> = {
    '4369': true
  };

  if (largeCapSet[c]) return '大型株';
  if (smallCapSet[c]) return '小型株';

  return '中型株';
}

export async function fetchMarketIndicesProfile(): Promise<{
  nikkei: MarketIndexMetrics | null;
  topix: MarketIndexMetrics | null;
  refDates: MarketReferenceDates | null;
}> {
  try {
    const targetUrlNikkei = `https://query1.finance.yahoo.com/v8/finance/chart/%5EN225?range=6mo&interval=1d&_t=${Date.now()}`;
    const rawNikkei = await fetchWithResilience(targetUrlNikkei, 2500);
    const nikkeiResult = rawNikkei?.chart?.result?.[0];
    const refDates = getMarketReferenceDatesFromChart(nikkeiResult);

    const [nikkeiProfile, topixProfile] = await Promise.all([
      fetchJpStockFullProfile('^N225', undefined, refDates || undefined),
      fetchJpStockFullProfile('1306.T', undefined, refDates || undefined)
    ]);

    const buildMetrics = (name: string, symbol: string, p: StockFullProfile | null): MarketIndexMetrics | null => {
      if (!p || !p.currentPrice) return null;
      const c = p.currentPrice;
      const prev = p.previousPrice || c;
      const p5 = p.price5DaysAgo || prev;
      const p20 = p.price20DaysAgo || prev;
      const pytd = p.priceYearStart || prev;

      return {
        name,
        symbol,
        currentPrice: c,
        previousPrice: prev,
        changePrevVal: Number((c - prev).toFixed(2)),
        changePrevPct: prev > 0 ? Number((((c - prev) / prev) * 100).toFixed(2)) : 0,
        price5DaysAgo: p5,
        change5dVal: Number((c - p5).toFixed(2)),
        change5dPct: p5 > 0 ? Number((((c - p5) / p5) * 100).toFixed(2)) : 0,
        price20DaysAgo: p20,
        change20dVal: Number((c - p20).toFixed(2)),
        change20dPct: p20 > 0 ? Number((((c - p20) / p20) * 100).toFixed(2)) : 0,
        priceYearStart: pytd,
        changeYtdVal: Number((c - pytd).toFixed(2)),
        changeYtdPct: pytd > 0 ? Number((((c - pytd) / pytd) * 100).toFixed(2)) : 0
      };
    };

    return {
      nikkei: buildMetrics('日経平均', '^N225', nikkeiProfile),
      topix: buildMetrics('TOPIX', '1306.T', topixProfile),
      refDates
    };
  } catch (e) {
    console.error('fetchMarketIndicesProfile failed:', e);
    return { nikkei: null, topix: null, refDates: null };
  }
}
