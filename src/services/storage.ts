import { StockItem, TabConfig, SyncSettings } from '../types';
import { getAutoTseJapaneseInfo } from './tseMaster';

const STORAGE_KEYS = {
  STOCKS: 'stock_portfolio_items_v2',
  TABS: 'stock_portfolio_tabs_v2',
  SETTINGS: 'stock_portfolio_settings_v2',
  BACKUP: 'stock_portfolio_backup_snapshot'
};

export const DEFAULT_TABS: TabConfig[] = [
  { id: 'tab-30', name: '30銘柄', description: 'メイン30銘柄ポートフォリオ', isDefault: true },
  { id: 'tab-a', name: 'A銘柄', description: 'Aグループ追加検討銘柄' },
  { id: 'tab-b', name: 'B銘柄', description: 'Bグループウォッチ銘柄' }
];

export function getStoredStocks(): StockItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCKS);
    if (!raw) return [];
    const parsed: StockItem[] = JSON.parse(raw);
    return parsed.map((s) => {
      const info = getAutoTseJapaneseInfo(s.code, s.name);
      return {
        ...s,
        name: info.name,
        sector: info.sector,
        // 既存のadoptDate（採用日）を厳格保持し、勝手に今日へ上書きしない！
        adoptDate: s.adoptDate || new Date().toISOString().split('T')[0]
      };
    });
  } catch (e) {
    console.error('Failed to get stored stocks:', e);
    return [];
  }
}

export function saveStocks(stocks: StockItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify(stocks));
  } catch (e) {
    console.error('Failed to save stocks:', e);
  }
}

export function getStoredTabs(): TabConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TABS);
    if (!raw) return DEFAULT_TABS;
    const parsed: TabConfig[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEFAULT_TABS;
  } catch (e) {
    return DEFAULT_TABS;
  }
}

export function saveTabs(tabs: TabConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(tabs));
  } catch (e) {
    console.error('Failed to save tabs:', e);
  }
}

export function getSyncSettings(): SyncSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { autoSync: false, syncIntervalMinutes: 5, apiEndpoint: '' };
    return JSON.parse(raw);
  } catch (e) {
    return { autoSync: false, syncIntervalMinutes: 5, apiEndpoint: '' };
  }
}

export function saveSyncSettings(settings: SyncSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// CSVファイルからの読み込み＆解析機能（指定採用日 adoptDate の完全復元対応）
export function parseAndImportCSV(csvText: string): { success: boolean; count: number; stocks: StockItem[] } {
  try {
    const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length <= 1) {
      return { success: false, count: 0, stocks: [] };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const importedStocks: StockItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const cleanedCells = cells.map((cell) => cell.replace(/^"|"$/g, '').trim());

      if (cleanedCells.length >= 2) {
        const code = (cleanedCells[0] || '').trim().toUpperCase();
        const rawName = cleanedCells[1] || '';
        if (!code) continue;

        const currentPrice = parseFloat(cleanedCells[2]) || 2500;
        const previousPrice = parseFloat(cleanedCells[3]) || currentPrice;
        const changePrevPct = parseFloat(cleanedCells[4]) || 0;
        const change5dPct = parseFloat(cleanedCells[5]) || 0;
        const change20dPct = parseFloat(cleanedCells[6]) || 0;
        const changeYtdPct = parseFloat(cleanedCells[7]) || 0;
        
        // 採用日（adoptDate）を正しく復元（未設定の場合のみ今日）
        const adoptDate = (cleanedCells[8] && cleanedCells[8] !== 'undefined') ? cleanedCells[8] : todayStr;
        const adoptPrice = parseFloat(cleanedCells[9]) || currentPrice;
        const changeAdoptPct = parseFloat(cleanedCells[10]) || 0;

        const tseInfo = getAutoTseJapaneseInfo(code, rawName);
        const sector = cleanedCells[11] || tseInfo.sector || 'その他';
        const marketCap = parseFloat(cleanedCells[12]) || tseInfo.marketCap || 10000;
        const scale = (cleanedCells[13] as any) || (marketCap >= 5000 ? '大型' : marketCap <= 1000 ? '小型' : '中型');

        const item: StockItem = {
          id: `imported-${code}-${Date.now()}-${i}`,
          code,
          name: tseInfo.name,
          currentPrice,
          previousPrice,
          changePrevPct,
          price5DaysAgo: Math.round(currentPrice / (1 + change5dPct / 100)),
          change5dPct,
          price20DaysAgo: Math.round(currentPrice / (1 + change20dPct / 100)),
          change20dPct,
          priceYearStart: Math.round(currentPrice / (1 + changeYtdPct / 100)),
          changeYtdPct,
          adoptDate,
          adoptPrice,
          changeAdoptPct,
          sector,
          marketCap,
          scale,
          tabId: 'tab-30',
          financialNotes: [],
          irComments: [
            {
              id: `ir-imported-${i}`,
              date: todayStr,
              title: 'CSVファイルよりインポート復元完了',
              category: '定性メモ・分析',
              content: `CSV保存ファイルより銘柄 [${code}] ${tseInfo.name} (指定採用日: ${adoptDate}) を無事復元取り込みいたしました。`,
              author: 'データ復元',
              tags: ['CSV復元'],
              createdAt: new Date().toISOString()
            }
          ],
          updatedAt: new Date().toISOString()
        };

        importedStocks.push(item);
      }
    }

    if (importedStocks.length > 0) {
      saveStocks(importedStocks);
      return { success: true, count: importedStocks.length, stocks: importedStocks };
    }

    return { success: false, count: 0, stocks: [] };
  } catch (e) {
    console.error('CSV parse error:', e);
    return { success: false, count: 0, stocks: [] };
  }
}

// JSONファイルからの取り込み読み込み機能
export function parseAndImportJSON(jsonText: string): { success: boolean; count: number; stocks: StockItem[] } {
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && Array.isArray(parsed.stocks) && parsed.stocks.length > 0) {
      const stocks: StockItem[] = parsed.stocks.map((s: StockItem) => {
        const info = getAutoTseJapaneseInfo(s.code, s.name);
        return { ...s, name: info.name, sector: info.sector || s.sector };
      });

      saveStocks(stocks);
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        saveTabs(parsed.tabs);
      }
      return { success: true, count: stocks.length, stocks };
    }
    return { success: false, count: 0, stocks: [] };
  } catch (e) {
    console.error('JSON parse error:', e);
    return { success: false, count: 0, stocks: [] };
  }
}

// 時価総額フォーマット
export function formatMarketCap(marketCapInOku: number): string {
  if (!marketCapInOku || isNaN(marketCapInOku)) return '-';
  if (marketCapInOku >= 10000) {
    const cho = (marketCapInOku / 10000).toFixed(1);
    return `${cho}兆円`;
  }
  return `${marketCapInOku.toLocaleString()}億円`;
}

// データ初期化
export async function initializeDefaultData(): Promise<{ stocks: StockItem[]; tabs: TabConfig[] }> {
  const existingStocks = getStoredStocks();
  const existingTabs = getStoredTabs();
  return { stocks: existingStocks, tabs: existingTabs };
}

// CSV & JSON 出力（採用日 adoptDate をそのまま厳格出力）
export function exportDataAsCSV(stocks: StockItem[]): void {
  if (!stocks || stocks.length === 0) {
    alert('エクスポート対象の銘柄データがありません。');
    return;
  }

  const headers = ['コード', '銘柄名', '現在価格', '前日価格', '前日比(%)', '5日前比(%)', '20日前比(%)', '年始比(%)', '採用日', '採用時価格', '採用時比(%)', 'セクター', '時価総額(億円)', '規模'];
  const rows = stocks.map((s) => {
    const info = getAutoTseJapaneseInfo(s.code, s.name);
    // 採用日（adoptDate）が正しくセットされているか確認し厳格出力
    const adoptDateVal = s.adoptDate || new Date().toISOString().split('T')[0];

    return [
      s.code,
      `"${info.name}"`,
      s.currentPrice,
      s.previousPrice,
      s.changePrevPct,
      s.change5dPct,
      s.change20dPct,
      s.changeYtdPct,
      adoptDateVal,
      s.adoptPrice,
      s.changeAdoptPct,
      `"${info.sector || s.sector}"`,
      s.marketCap,
      s.scale
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `stock_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDataAsJSON(stocks: StockItem[], tabs: TabConfig[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    tabs,
    stocks
  };
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `stock_portfolio_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
