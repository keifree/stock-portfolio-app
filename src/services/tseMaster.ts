import tseFullData from './tseFullData.json';

export interface TseMasterItem {
  code: string;
  name: string;
  sector: string;
  marketCap?: number;
  sharesOutstanding?: number;
}

// 東証全4,000銘柄ルックアップ辞書
const fullMap: Record<string, TseMasterItem> = {};
try {
  if (Array.isArray(tseFullData)) {
    (tseFullData as any[]).forEach((item) => {
      if (item && item.code) {
        const codeStr = String(item.code).trim().toUpperCase();
        fullMap[codeStr] = {
          code: codeStr,
          name: item.name || `銘柄 (${codeStr})`,
          sector: item.sector || 'その他',
          marketCap: item.marketCap,
          sharesOutstanding: item.sharesOutstanding
        };
      }
    });
  }
} catch (e) {
  // ignore
}

export function getAutoTseJapaneseInfo(code: string, fallbackName?: string): TseMasterItem {
  const cleanCode = (code || '').trim().toUpperCase();

  if (fullMap[cleanCode] && fullMap[cleanCode].name) {
    return fullMap[cleanCode];
  }

  return {
    code: cleanCode,
    name: fallbackName || `銘柄 (${cleanCode})`,
    sector: 'その他'
  };
}

export function applyJapaneseNamesToAllStocks(stocks: any[]): { updatedStocks: any[]; changedCount: number } {
  let changedCount = 0;
  const updatedStocks = (stocks || []).map((s) => {
    if (!s || !s.code) return s;
    const cleanCode = String(s.code).trim().toUpperCase();
    const master = getAutoTseJapaneseInfo(cleanCode, s.name);

    if (master && master.name) {
      const isEnglishOrCode = /^[A-Za-z0-9\s.,&\-()/]+$/.test(s.name) || s.name.includes('.T') || s.name === cleanCode || s.name.startsWith('銘柄 (');
      const calcCap = calculateDynamicMarketCap(cleanCode, s.currentPrice || 0);
      const capToUse = calcCap > 0 ? calcCap : (s.marketCap || 0);
      const scaleToUse = capToUse >= 5000 ? '大型' : capToUse > 0 && capToUse <= 1000 ? '小型' : '中型';

      if (isEnglishOrCode || (master.name !== `銘柄 (${cleanCode})` && s.name !== master.name) || (calcCap > 0 && s.marketCap !== calcCap)) {
        changedCount++;
        return {
          ...s,
          name: master.name,
          sector: master.sector || s.sector || 'その他',
          marketCap: capToUse > 0 ? capToUse : s.marketCap,
          scale: scaleToUse
        };
      }
    }
    return s;
  });

  return { updatedStocks, changedCount };
}

export function calculateDynamicMarketCap(code: string, price: number): number {
  const cleanCode = (code || '').trim().toUpperCase();
  const item = fullMap[cleanCode];
  
  if (item) {
    // 東証公式の発行済株式数(億株) × 最新株価(円) によるリアルタイム全自動時価総額計算
    if (item.sharesOutstanding && item.sharesOutstanding > 0 && price > 0) {
      return Math.round(price * item.sharesOutstanding);
    }
    if (item.marketCap && item.marketCap > 0) {
      return item.marketCap;
    }
  }

  return 0;
}
