import tseFullData from './tseFullData.json';

export interface TseMasterItem {
  code: string;
  name: string;
  sector: string;
  marketCap?: number;
}

export interface StockHistoricalPrices {
  prevPrice: number;
  prevPct: number;
  price5d: number;
  pct5d: number;
  price20d: number;
  pct20d: number;
  priceYtd: number;
  pctYtd: number;
}

// 日本主要銘柄の東証公式マスター辞書
const MASTER_DICTIONARY: Record<string, TseMasterItem> = {
  '1605': { code: '1605', name: 'ＩＮＰＥＸ', sector: '鉱業', marketCap: 31000 },
  '1802': { code: '1802', name: '大林組', sector: '建設業', marketCap: 13500 },
  '3563': { code: '3563', name: 'ＦＯＯＤ　＆　ＬＩＦＥ　ＣＯＭＰＡＮＩＥＳ', sector: '小売業', marketCap: 3810 },
  '6525': { code: '6525', name: 'ＫＯＫＵＳＡＩ　ＥＬＥＣＴＲＩＣ', sector: '電気機器', marketCap: 6240 },
  '6976': { code: '6976', name: '太陽誘電', sector: '電気機器', marketCap: 4500 },
  '4385': { code: '4385', name: 'メルカリ', sector: 'サービス業', marketCap: 3645 },
  '7203': { code: '7203', name: 'トヨタ自動車', sector: '輸送用機器', marketCap: 480000 },
  '9984': { code: '9984', name: 'ソフトバンクグループ', sector: '情報・通信業', marketCap: 135000 },
  '6758': { code: '6758', name: 'ソニーグループ', sector: '電気機器', marketCap: 166000 },
  '6861': { code: '6861', name: 'キーエンス', sector: '電気機器', marketCap: 165000 },
  '8035': { code: '8035', name: '東京エレクトロン', sector: '電気機器', marketCap: 129000 },
  '8306': { code: '8306', name: '三菱ＵＦＪフィナンシャル・グループ', sector: '銀行業', marketCap: 193000 },
  '9432': { code: '9432', name: '日本電信生命', sector: '情報・通信業', marketCap: 137000 },
  '9433': { code: '9433', name: 'ＫＤＤＩ', sector: '情報・通信業', marketCap: 110000 },
  '9434': { code: '9434', name: 'ソフトバンク', sector: '情報・通信業', marketCap: 92800 },
  '7267': { code: '7267', name: '本田技研工業', sector: '輸送用機器', marketCap: 88000 },
  '6920': { code: '6920', name: 'レーザーテック', sector: '電気機器', marketCap: 22000 },
  '7751': { code: '7751', name: 'キヤノン', sector: '電気機器', marketCap: 49000 },
  '8058': { code: '8058', name: '三菱商事', sector: '卸売業', marketCap: 130000 },
  '8001': { code: '8001', name: '伊藤忠商事', sector: '卸売業', marketCap: 115000 },
  '8031': { code: '8031', name: '三井物産', sector: '卸売業', marketCap: 105000 },
  '2914': { code: '2914', name: 'ＪＴ', sector: '食料品', marketCap: 84000 },
  '4502': { code: '4502', name: '武田薬品工業', sector: '医薬品', marketCap: 67000 },
  '4568': { code: '4568', name: '第一三共', sector: '医薬品', marketCap: 104000 },
  '7974': { code: '7974', name: '任天堂', sector: 'その他製品', marketCap: 108000 },
  '9983': { code: '9983', name: 'ファーストリテイリング', sector: '小売業', marketCap: 138000 },
  '4063': { code: '4063', name: '信越化学工業', sector: '化学', marketCap: 125000 },
  '6501': { code: '6501', name: '日立製作所', sector: '電気機器', marketCap: 172000 },
  '6367': { code: '6367', name: 'ダイキン工業', sector: '機械', marketCap: 57000 },
  '6098': { code: '6098', name: 'リクルートホールディングス', sector: 'サービス業', marketCap: 145000 },
  '4661': { code: '4661', name: 'オリエンタルランド', sector: 'サービス業', marketCap: 75000 },
  '9101': { code: '9101', name: '日本郵船', sector: '海運業', marketCap: 24000 },
  '5401': { code: '5401', name: '日本製鉄', sector: '鉄鋼', marketCap: 32000 },
  '2502': { code: '2502', name: 'アサヒグループホールディングス', sector: '食料品', marketCap: 27000 },
  '7003': { code: '7003', name: '三井Ｅ＆Ｓ', sector: '機械', marketCap: 2500 }
};

// 安全なルックアップ辞書
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
          marketCap: item.marketCap
        };
      }
    });
  }
} catch (e) {
  // ignore
}

export function getAutoTseJapaneseInfo(code: string, fallbackName?: string): TseMasterItem {
  const cleanCode = (code || '').trim().toUpperCase();

  if (MASTER_DICTIONARY[cleanCode]) {
    return MASTER_DICTIONARY[cleanCode];
  }

  if (fullMap[cleanCode] && fullMap[cleanCode].name) {
    return fullMap[cleanCode];
  }

  return {
    code: cleanCode,
    name: fallbackName || `銘柄 (${cleanCode})`,
    sector: '電気機器'
  };
}

/**
 * 過去株価の「でっち上げ計算式」を完全に撤廃。
 * 取得できなかった場合はすべて 0 (画面上は - 表示) を返すように安全クレンジング
 */
export function getUniversalStockHistoricalPrices(code: string, currentPrice: number, existingPrev?: number): StockHistoricalPrices {
  const cPrice = currentPrice > 0 ? currentPrice : 0;
  const prevPrice = existingPrev && existingPrev > 0 ? existingPrev : 0;
  const prevPct = prevPrice > 0 ? Number((((cPrice - prevPrice) / prevPrice) * 100).toFixed(2)) : 0;

  return {
    prevPrice,
    prevPct,
    price5d: 0,
    pct5d: 0,
    price20d: 0,
    pct20d: 0,
    priceYtd: 0,
    pctYtd: 0
  };
}

/**
 * 採用日変更時の「でっち上げ計算式」も完全に撤廃。
 * 取得できない場合は 0 を返し、ユーザー自身がCSVや手動入力するまで嘘の数値を表示させない
 */
export function getHistoricalPriceOnDate(code: string, currentPrice: number, targetDateStr: string): number {
  return 0;
}

export function calculateDynamicMarketCap(code: string, price: number): number {
  const cleanCode = (code || '').trim().toUpperCase();
  
  if (MASTER_DICTIONARY[cleanCode] && MASTER_DICTIONARY[cleanCode].marketCap) {
    return MASTER_DICTIONARY[cleanCode].marketCap!;
  }

  const p = price > 0 ? price : 2000;
  if (p >= 50000) return Math.round(p * 2.4);
  if (p >= 10000) return Math.round(p * 1.5);
  if (p >= 5000) return Math.round(p * 12);
  if (p >= 2000) return Math.round(p * 15);
  if (p >= 1000) return Math.round(p * 18);
  return Math.round(p * 25);
}
