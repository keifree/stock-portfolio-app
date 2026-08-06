import { StockItem, TabConfig, SyncSettings } from '../types';
import { getAutoTseJapaneseInfo, calculateDynamicMarketCap, getUniversalStockHistoricalPrices } from './tseMaster';

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
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    return parsed
      .filter((s) => s && typeof s === 'object' && s.code)
      .map((s) => {
        const info = getAutoTseJapaneseInfo(s.code, s.name);
        const currentPrice = typeof s.currentPrice === 'number' && s.currentPrice > 0 ? s.currentPrice : 2000;
        
        const realCap = calculateDynamicMarketCap(s.code, currentPrice);

        let cleanAdoptDate = '2024-08-01';
        if (typeof s.adoptDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.adoptDate)) {
          cleanAdoptDate = s.adoptDate;
        }

        const adoptPrice = typeof s.adoptPrice === 'number' && s.adoptPrice > 0 ? s.adoptPrice : 0;
        const changeAdoptPct = typeof s.changeAdoptPct === 'number' ? s.changeAdoptPct : 0;

        const previousPrice = typeof s.previousPrice === 'number' && s.previousPrice > 0 ? s.previousPrice : 0;
        const changePrevPct = typeof s.changePrevPct === 'number' ? s.changePrevPct : 0;
        const price5DaysAgo = typeof s.price5DaysAgo === 'number' && s.price5DaysAgo > 0 ? s.price5DaysAgo : 0;
        const change5dPct = typeof s.change5dPct === 'number' ? s.change5dPct : 0;
        const price20DaysAgo = typeof s.price20DaysAgo === 'number' && s.price20DaysAgo > 0 ? s.price20DaysAgo : 0;
        const change20dPct = typeof s.change20dPct === 'number' ? s.change20dPct : 0;
        const priceYearStart = typeof s.priceYearStart === 'number' && s.priceYearStart > 0 ? s.priceYearStart : 0;
        const changeYtdPct = typeof s.changeYtdPct === 'number' ? s.changeYtdPct : 0;

        return {
          ...s,
          id: s.id || `stock-${s.code}-${Math.random()}`,
          name: info.name || s.name || `銘柄 (${s.code})`,
          currentPrice,
          previousPrice,
          changePrevPct,
          price5DaysAgo,
          change5dPct,
          price20DaysAgo,
          change20dPct,
          priceYearStart,
          changeYtdPct,
          adoptDate: cleanAdoptDate,
          adoptPrice,
          changeAdoptPct,
          sector: info.sector || '電気機器',
          marketCap: realCap,
          scale: realCap >= 5000 ? '大型' : realCap <= 1000 ? '小型' : '中型',
          tabId: s.tabId || 'tab-30',
          financialNotes: Array.isArray(s.financialNotes) ? s.financialNotes : [],
          irComments: Array.isArray(s.irComments) ? s.irComments : [],
          updatedAt: s.updatedAt || new Date().toISOString()
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
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TABS;
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

export function createBackup(): { success: boolean; time: string; count: number } {
  try {
    const stocks = getStoredStocks();
    const tabs = getStoredTabs();
    const now = new Date().toLocaleString('ja-JP');
    const snapshot = {
      timestamp: now,
      count: stocks.length,
      stocks,
      tabs
    };
    localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(snapshot));
    return { success: true, time: now, count: stocks.length };
  } catch (e) {
    return { success: false, time: '', count: 0 };
  }
}

export function restoreFromBackup(): { success: boolean; time: string; count: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKUP);
    if (!raw) return { success: false, time: '', count: 0 };
    const snapshot = JSON.parse(raw);
    if (snapshot && Array.isArray(snapshot.stocks)) {
      saveStocks(snapshot.stocks);
      if (Array.isArray(snapshot.tabs)) {
        saveTabs(snapshot.tabs);
      }
      return { success: true, time: snapshot.timestamp || '', count: snapshot.stocks.length };
    }
    return { success: false, time: '', count: 0 };
  } catch (e) {
    return { success: false, time: '', count: 0 };
  }
}

export function getBackupInfo(): { exists: boolean; time?: string; count?: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKUP);
    if (!raw) return { exists: false };
    const snapshot = JSON.parse(raw);
    return { exists: true, time: snapshot.timestamp, count: snapshot.count };
  } catch (e) {
    return { exists: false };
  }
}

export function formatMarketCap(marketCapInOku: number): string {
  if (!marketCapInOku || isNaN(marketCapInOku) || marketCapInOku <= 0) return '-';
  if (marketCapInOku >= 10000) {
    const cho = (marketCapInOku / 10000).toFixed(1);
    return `${cho}兆円`;
  }
  return `${Math.round(marketCapInOku).toLocaleString()}億円`;
}

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
        if (!code || code === 'コード') continue;

        const currentPrice = parseFloat(cleanedCells[2]) || 2000;
        const previousPrice = parseFloat(cleanedCells[3]) || currentPrice;
        const changePrevPct = parseFloat(cleanedCells[4]) || 0;

        const change5dPct = parseFloat(cleanedCells[5]) || 0;
        const change20dPct = parseFloat(cleanedCells[6]) || 0;
        const changeYtdPct = parseFloat(cleanedCells[7]) || 0;

        const price5DaysAgo = Math.round(currentPrice / (1 + change5dPct / 100));
        const price20DaysAgo = Math.round(currentPrice / (1 + change20dPct / 100));
        const priceYearStart = Math.round(currentPrice / (1 + changeYtdPct / 100));

        let adoptDate = '2024-08-01';
        const rawAdoptCell = cleanedCells[8];
        if (rawAdoptCell && /^\d{4}-\d{2}-\d{2}$/.test(rawAdoptCell)) {
          adoptDate = rawAdoptCell;
        }

        const adoptPrice = parseFloat(cleanedCells[9]) || currentPrice;
        const changeAdoptPct = parseFloat(cleanedCells[10]) || Number((((currentPrice - adoptPrice) / adoptPrice) * 100).toFixed(2));

        const tseInfo = getAutoTseJapaneseInfo(code, rawName);
        const sector = (cleanedCells[11] && cleanedCells[11] !== 'その他') ? cleanedCells[11] : tseInfo.sector;
        
        const marketCap = calculateDynamicMarketCap(code, currentPrice);
        const scale = marketCap >= 5000 ? '大型' : marketCap <= 1000 ? '小型' : '中型';

        const item: StockItem = {
          id: `imported-${code}-${Date.now()}-${i}`,
          code,
          name: tseInfo.name,
          currentPrice,
          previousPrice,
          changePrevPct,
          price5DaysAgo,
          change5dPct,
          price20DaysAgo,
          change20dPct,
          priceYearStart,
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
              content: `CSV保存ファイルより銘柄 [${code}] ${tseInfo.name} を無事復元取り込みいたしました。`,
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

export async function initializeDefaultData(): Promise<{ stocks: StockItem[]; tabs: TabConfig[] }> {
  const existingStocks = getStoredStocks();
  const existingTabs = getStoredTabs();
  return { stocks: existingStocks, tabs: existingTabs };
}

export function exportDataAsCSV(stocks: StockItem[]): void {
  if (!stocks || stocks.length === 0) {
    alert('エクスポート対象の銘柄データがありません。');
    return;
  }

  const headers = ['コード', '銘柄名', '現在価格', '前日価格', '前日比(%)', '5日前比(%)', '20日前比(%)', '年始比(%)', '採用日', '採用時価格', '採用時比(%)', 'セクター', '時価総額(億円)', '規模'];
  const rows = stocks.map((s) => {
    const info = getAutoTseJapaneseInfo(s.code, s.name);
    let adoptDateVal = '2024-08-01';
    if (typeof s.adoptDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.adoptDate)) {
      adoptDateVal = s.adoptDate;
    }

    return [
      s.code,
      `"${info.name}"`,
      s.currentPrice || 0,
      s.previousPrice || 0,
      s.changePrevPct || 0,
      s.change5dPct || 0,
      s.change20dPct || 0,
      s.changeYtdPct || 0,
      adoptDateVal,
      s.adoptPrice || 0,
      s.changeAdoptPct || 0,
      `"${info.sector || s.sector || 'その他'}"`,
      s.marketCap || 0,
      s.scale || '中型'
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
