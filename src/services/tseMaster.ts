import tseFullData from './tseFullData.json';

export interface TseMasterItem {
  code: string;
  name: string;
  sector: string;
  marketCap?: number;
}

const MASTER_DICTIONARY: Record<string, TseMasterItem> = {
  '3563': { code: '3563', name: 'ＦＯＯＤ　＆　ＬＩＦＥ　ＣＯＭＰＡＮＩＥＳ', sector: '小売業', marketCap: 3800 },
  '6525': { code: '6525', name: 'ＫＯＫＵＳＡＩ　ＥＬＥＣＴＲＩＣ', sector: '電気機器', marketCap: 6200 },
  '7203': { code: '7203', name: 'トヨタ自動車', sector: '輸送用機器', marketCap: 480000 },
  '9984': { code: '9984', name: 'ソフトバンクグループ', sector: '情報・通信業', marketCap: 132000 },
  '6758': { code: '6758', name: 'ソニーグループ', sector: '電気機器', marketCap: 160000 },
  '6861': { code: '6861', name: 'キーエンス', sector: '電気機器', marketCap: 170000 },
  '8035': { code: '8035', name: '東京エレクトロン', sector: '電気機器', marketCap: 120000 },
  '8306': { code: '8306', name: '三菱ＵＦＪフィナンシャル・グループ', sector: '銀行業', marketCap: 190000 },
  '9432': { code: '9432', name: '日本電信電話', sector: '情報・通信業', marketCap: 140000 },
  '9433': { code: '9433', name: 'ＫＤＤＩ', sector: '情報・通信業', marketCap: 110000 },
  '1605': { code: '1605', name: 'ＩＮＰＥＸ', sector: '鉱業', marketCap: 31000 },
  '7267': { code: '7267', name: '本田技研工業', sector: '輸送用機器', marketCap: 88000 },
  '6920': { code: '6920', name: 'レーザーテック', sector: '電気機器', marketCap: 22000 },
  '7751': { code: '7751', name: 'キヤノン', sector: '電気機器', marketCap: 49000 },
  '8058': { code: '8058', name: '三菱商事', sector: '卸売業', marketCap: 130000 },
  '8001': { code: '8001', name: '伊藤忠商事', sector: '卸売業', marketCap: 115000 },
  '8031': { code: '8031', name: '三井物産', sector: '卸売業', marketCap: 105000 },
  '4385': { code: '4385', name: 'メルカリ', sector: 'サービス業', marketCap: 3600 }
};

const fullMap: Record<string, TseMasterItem> = {};
if (Array.isArray(tseFullData)) {
  (tseFullData as TseMasterItem[]).forEach((item) => {
    if (item.code) {
      fullMap[item.code] = item;
    }
  });
}

function cleanEnglishCompanyName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/\s+(INC|CORP|LIMITED|LTD|HOLDINGS|CO\.,?LTD\.|GROUP|PLC|SA|NV)\.?$/i, '')
    .replace(/,/g, '')
    .trim();
}

export function getAutoTseJapaneseInfo(code: string, fallbackName?: string): TseMasterItem {
  const cleanCode = (code || '').trim().toUpperCase();

  // 1st Priority: ローカルマスタ辞書
  if (MASTER_DICTIONARY[cleanCode]) {
    return MASTER_DICTIONARY[cleanCode];
  }

  // 2nd Priority: 東証全銘柄データベース (tseFullData.json)
  if (fullMap[cleanCode]) {
    return fullMap[cleanCode];
  }

  // 3rd Priority: 英語表記の綺麗化
  if (fallbackName && fallbackName !== cleanCode) {
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(fallbackName)) {
      return { code: cleanCode, name: fallbackName, sector: 'その他' };
    }
    const cleanedEng = cleanEnglishCompanyName(fallbackName);
    if (cleanedEng) {
      return { code: cleanCode, name: cleanedEng, sector: 'その他' };
    }
  }

  return {
    code: cleanCode,
    name: fallbackName || `銘柄 (${cleanCode})`,
    sector: 'その他'
  };
}
