import { StockItem, TabConfig, SyncSettings } from '../types';
import { getAutoTseJapaneseInfo, calculateDynamicMarketCap } from './tseMaster';

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

export function cleanStockForStorage(stock: StockItem): StockItem {
  if (!stock) return stock;
  const { chartHistory, ...rest } = stock;
  return {
    ...rest,
    financialNotes: Array.isArray(stock.financialNotes) 
      ? stock.financialNotes.map(n => ({
          id: n.id,
          date: n.date,
          title: n.title,
          evaluation: n.evaluation,
          comment: n.comment,
          pinned: n.pinned,
          updatedAt: n.updatedAt
        }))
      : [],
    irComments: Array.isArray(stock.irComments) ? stock.irComments : [],
    featureNotes: Array.isArray(stock.featureNotes) ? stock.featureNotes : []
  };
}

export function saveStocks(stocks: StockItem[]): void {
  try {
    const cleaned = (stocks || []).map(cleanStockForStorage);
    localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify(cleaned));
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



function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseAndImportHorizontalFinancialCSV(csvText: string): { success: boolean; importedNotesCount: number; affectedStocksCount: number; stocks: StockItem[] } {
  try {
    const currentStocks = getStoredStocks();
    if (!currentStocks || currentStocks.length === 0) {
      return { success: false, importedNotesCount: 0, affectedStocksCount: 0, stocks: [] };
    }

    const cleanText = csvText.replace(/^\uFEFF/, '');
    
    // カンマ区切りかつ改行対応の行分割
    const rawLines: string[] = [];
    let curLine = '';
    let inQ = false;
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      if (char === '"') {
        inQ = !inQ;
        curLine += char;
      } else if ((char === '\n' || char === '\r') && !inQ) {
        if (char === '\r' && cleanText[i + 1] === '\n') {
          i++;
        }
        if (curLine.trim().length > 0) {
          rawLines.push(curLine);
        }
        curLine = '';
      } else {
        curLine += char;
      }
    }
    if (curLine.trim().length > 0) {
      rawLines.push(curLine);
    }

    let importedNotesCount = 0;
    let affectedStocksCount = 0;

    const stocksMap = new Map<string, StockItem>();
    currentStocks.forEach(s => stocksMap.set(s.code.toUpperCase(), { ...s }));

    rawLines.forEach(line => {
      const cells = parseCSVLine(line);
      if (cells.length < 3) return;

      const code = cells[0].toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (!code) return;

      const targetStock = stocksMap.get(code);
      if (!targetStock) return;

      let stockNotesAdded = 0;
      const newNotes: any[] = [];

      for (let i = 1; i < cells.length; i += 2) {
        const rawDate = (cells[i] || '').trim();
        const rawComment = (cells[i + 1] || '').trim();

        if (!rawDate && !rawComment) continue;

        // 日付の正規化 (YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD 等)
        let formattedDate = rawDate;
        const dateMatch = rawDate.match(/^(\d{4})[/-]?(\d{1,2})[/-]?(\d{1,2})$/);
        if (dateMatch) {
          const y = dateMatch[1];
          const m = dateMatch[2].padStart(2, '0');
          const d = dateMatch[3].padStart(2, '0');
          formattedDate = `${y}-${m}-${d}`;
        }

        newNotes.push({
          id: `fin-imp-${code}-${Date.now()}-${i}`,
          date: formattedDate,
          title: '',
          evaluation: '未選択',
          comment: rawComment,
          updatedAt: new Date().toISOString()
        });

        stockNotesAdded++;
        importedNotesCount++;
      }

      if (stockNotesAdded > 0) {
        affectedStocksCount++;
        const existingNotes = Array.isArray(targetStock.financialNotes) ? targetStock.financialNotes : [];
        targetStock.financialNotes = [...newNotes, ...existingNotes];
      }
    });

    if (importedNotesCount > 0) {
      const updatedStocksList = Array.from(stocksMap.values());
      saveStocks(updatedStocksList);
      return { success: true, importedNotesCount, affectedStocksCount, stocks: updatedStocksList };
    }

    return { success: false, importedNotesCount: 0, affectedStocksCount: 0, stocks: currentStocks };
  } catch (e) {
    console.error('Horizontal CSV import error:', e);
    return { success: false, importedNotesCount: 0, affectedStocksCount: 0, stocks: [] };
  }
}

export async function fetchRemoteJSON(url: string): Promise<{ success: boolean; count: number; stocks: StockItem[]; tabs: TabConfig[] }> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) {
      return { success: false, count: 0, stocks: [], tabs: [] };
    }
    const text = await res.text();
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.stocks) && parsed.stocks.length > 0) {
      const stocks: StockItem[] = parsed.stocks.map((s: StockItem) => {
        const info = getAutoTseJapaneseInfo(s.code, s.name);
        return { ...s, name: info.name, sector: info.sector || s.sector };
      });
      const tabs = Array.isArray(parsed.tabs) && parsed.tabs.length > 0 ? parsed.tabs : DEFAULT_TABS;
      return { success: true, count: stocks.length, stocks, tabs };
    }
    return { success: false, count: 0, stocks: [], tabs: [] };
  } catch (e) {
    console.error('Failed to fetch remote JSON:', e);
    return { success: false, count: 0, stocks: [], tabs: [] };
  }
}

export function parseAndImportJSON(jsonText: string): { success: boolean; count: number; stocks: StockItem[]; tabs?: TabConfig[] } {
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



export function exportDataAsJSON(stocks: StockItem[], tabs: TabConfig[]): void {
  const rawOriginalSize = JSON.stringify({ tabs, stocks }, null, 2).length;

  const cleanedStocks = (stocks || []).map(cleanStockForStorage);
  const data = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    tabs,
    stocks: cleanedStocks
  };
  const jsonContent = JSON.stringify(data);
  const optimizedSize = jsonContent.length;

  const originalKB = (rawOriginalSize / 1024).toFixed(1);
  const optimizedKB = (optimizedSize / 1024).toFixed(1);
  const reductionPct = Math.round(((rawOriginalSize - optimizedSize) / Math.max(1, rawOriginalSize)) * 100);

  alert(`【JSONデータの高速軽量化を実行しました】\n\n・最適化前: 約 ${originalKB} KB (${(rawOriginalSize / 1024 / 1024).toFixed(2)} MB)\n・最適化後: 約 ${optimizedKB} KB (${(optimizedSize / 1024 / 1024).toFixed(2)} MB)\n・容量削減率: 【 ${reductionPct}% 削減 】\n\n無駄な自動キャッシュを削ぎ落とした軽量JSONファイルをダウンロードします。`);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `stock_portfolio_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
