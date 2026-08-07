import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StockItem, TabConfig, SyncSettings } from './types';
import { applyJapaneseNamesToAllStocks } from './services/tseMaster';
import {
  initializeDefaultData,
  saveStocks,
  saveTabs,
  getSyncSettings,
  saveSyncSettings,
  exportDataAsJSON,
  parseAndImportJSON,
  fetchRemoteJSON,
  DEFAULT_TABS
} from './services/storage';

import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { StockTable } from './components/StockTable';
import { AddStockModal } from './components/AddStockModal';
import { StockDetailModal } from './components/StockDetailModal';
import { ShareConfigModal } from './components/ShareConfigModal';
import { DebugModal } from './components/DebugModal';
import { MarketOverviewTiles } from './components/MarketOverviewTiles';
import { Footer } from './components/Footer';
import { fetchJpStockFullProfile, fetchMarketIndicesProfile, MarketIndexMetrics, MarketReferenceDates } from './services/yahooFinance';
import { Lock } from 'lucide-react';

const isSameStockCode = (codeA: string, codeB: string): boolean => {
  if (!codeA || !codeB) return false;
  const cleanA = codeA.trim().toUpperCase().replace(/\.T$/i, '');
  const cleanB = codeB.trim().toUpperCase().replace(/\.T$/i, '');
  const mA = cleanA.match(/(\d{4})/);
  const mB = cleanB.match(/(\d{4})/);
  if (mA && mB) return mA[1] === mB[1];
  return cleanA === cleanB;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const App: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [tabs, setTabs] = useState<TabConfig[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-30');
  const [settings, setSettings] = useState<SyncSettings>({ autoSync: false, syncIntervalMinutes: 5, apiEndpoint: '' });
  const [loading, setLoading] = useState<boolean>(true);

  const [marketIndices, setMarketIndices] = useState<{ nikkei: MarketIndexMetrics | null; topix: MarketIndexMetrics | null }>({
    nikkei: null,
    topix: null
  });
  const [marketRefDates, setMarketRefDates] = useState<MarketReferenceDates | null>(null);

  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isLinkExpired, setIsLinkExpired] = useState<boolean>(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const editorUrl = baseUrl;

  const isSyncingRef = useRef<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const res = parseAndImportJSON(content);

      if (res.success && res.stocks.length > 0) {
        setStocks(res.stocks);
        if (res.tabs && res.tabs.length > 0) {
          setTabs(res.tabs);
        }
        alert(`【読み込み成功】\nJSONファイルから銘柄データ [ ${res.count}件 ] をインポート復元しました。\nバックグラウンドで時間を分散させて本物の株価と同期します。`);
        await updateAllStocksRealDataSequentially(res.stocks);
      } else {
        alert('JSONファイルの読み込みに失敗しました。正しいフォーマットのファイルかご確認ください。');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  /**
   * 4銘柄並列バッチ処理による実株価同期関数
   */
  const updateAllStocksRealDataSequentially = useCallback(async (
    targetsToUpdate: StockItem[],
    customRefDates?: MarketReferenceDates
  ) => {
    if (!targetsToUpdate || targetsToUpdate.length === 0) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setSyncProgress({ current: 0, total: targetsToUpdate.length });

    const refDatesToUse = customRefDates || marketRefDates || undefined;

    try {
      const batchSize = 4;
      for (let i = 0; i < targetsToUpdate.length; i += batchSize) {
        const batch = targetsToUpdate.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(async (stock) => {
            const real = await fetchJpStockFullProfile(stock.code, stock.adoptDate, refDatesToUse);
            return { stock, real };
          })
        );

        setStocks((prevStocks) => {
          let updated = [...prevStocks];
          for (const res of results) {
            if (res.status === 'fulfilled' && res.value.real && res.value.real.currentPrice > 5) {
              const { stock, real } = res.value;
              const changePrevPct = Number((((real.currentPrice - real.previousPrice) / real.previousPrice) * 100).toFixed(2));
              const change5dPct = Number((((real.currentPrice - real.price5DaysAgo) / real.price5DaysAgo) * 100).toFixed(2));
              const change20dPct = Number((((real.currentPrice - real.price20DaysAgo) / real.price20DaysAgo) * 100).toFixed(2));
              const changeYtdPct = Number((((real.currentPrice - real.priceYearStart) / real.priceYearStart) * 100).toFixed(2));

              const adoptPrice = real.adoptPrice || stock.adoptPrice || real.currentPrice;
              const changeAdoptPct = adoptPrice > 0 ? Number((((real.currentPrice - adoptPrice) / adoptPrice) * 100).toFixed(2)) : 0;

              updated = updated.map((s) => {
                if (isSameStockCode(s.code, stock.code)) {
                  const capToUse = (real.marketCap && real.marketCap > 0) ? real.marketCap : (s.marketCap || 0);
                  const scaleToUse: '大型' | '中型' | '小型' = capToUse >= 5000 ? '大型' : (capToUse > 0 && capToUse <= 1000) ? '小型' : '中型';

                  return {
                    ...s,
                    currentPrice: real.currentPrice,
                    previousPrice: real.previousPrice,
                    changePrevPct,
                    price5DaysAgo: real.price5DaysAgo,
                    change5dPct,
                    price20DaysAgo: real.price20DaysAgo,
                    change20dPct,
                    priceYearStart: real.priceYearStart,
                    changeYtdPct,
                    adoptPrice,
                    changeAdoptPct,
                    marketCap: capToUse > 0 ? capToUse : s.marketCap,
                    scale: scaleToUse
                  };
                }
                return s;
              });
            }
          }
          saveStocks(updated);
          return updated;
        });

        const nextCount = Math.min(i + batchSize, targetsToUpdate.length);
        setSyncProgress({ current: nextCount, total: targetsToUpdate.length });

        await sleep(50);
      }
    } catch (err) {
      console.error('Batch sync failed:', err);
    } finally {
      isSyncingRef.current = false;
      setSyncProgress(null);
    }
  }, [marketRefDates]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('reset') || params.has('clear')) {
          localStorage.removeItem('stock_portfolio_tabs_v2');
          localStorage.removeItem('stock_portfolio_settings_v2');
          localStorage.removeItem('stock_portfolio_backup_snapshot');
          window.location.href = window.location.origin + window.location.pathname;
          return;
        }

        const mode = params.get('mode');
        const role = params.get('role');
        const isRead = mode === 'readonly' || role === 'viewer' || mode === 'view' || params.has('readonly');

        if (isRead) {
          setIsReadOnly(true);
          const keyParam = params.get('key');
          const t = new Date();
          const y = t.getFullYear();
          const m = String(t.getMonth() + 1).padStart(2, '0');
          const expectedKey = btoa(`stock-${y}-${m}`).substring(0, 8);

          if (keyParam !== expectedKey) {
            setIsLinkExpired(true);
          }
        }
      } catch (e) {
        console.error('URL params parse warning:', e);
      }
    }

    async function load() {
      try {
        const storedSettings = getSyncSettings();
        setSettings(storedSettings);

        const params = new URLSearchParams(window.location.search);
        const dataUrlParam = params.get('dataUrl') || params.get('json') || storedSettings.apiEndpoint;

        let loadedStocks: StockItem[] = [];
        let loadedTabs: TabConfig[] = DEFAULT_TABS;

        if (dataUrlParam) {
          const remote = await fetchRemoteJSON(dataUrlParam);
          if (remote.success && remote.stocks.length > 0) {
            loadedStocks = remote.stocks;
            loadedTabs = remote.tabs;
          } else {
            const def = await initializeDefaultData();
            loadedStocks = def.stocks;
            loadedTabs = def.tabs;
          }
        } else {
          const def = await initializeDefaultData();
          loadedStocks = def.stocks;
          loadedTabs = def.tabs;
        }

        let safeStocks = Array.isArray(loadedStocks) ? loadedStocks : [];
        const safeTabs = Array.isArray(loadedTabs) && loadedTabs.length > 0 ? loadedTabs : DEFAULT_TABS;

        const { updatedStocks: jpCleanedStocks, changedCount } = applyJapaneseNamesToAllStocks(safeStocks);
        if (changedCount > 0) {
          safeStocks = jpCleanedStocks;
        }

        safeStocks = safeStocks.map((s) => {
          const cleanPrice = (val: number) => (val === 90 || val < 1.0) ? 0 : val;
          return {
            ...s,
            previousPrice: cleanPrice(s.previousPrice || 0),
            price5DaysAgo: cleanPrice(s.price5DaysAgo || 0),
            price20DaysAgo: cleanPrice(s.price20DaysAgo || 0),
            priceYearStart: cleanPrice(s.priceYearStart || 0),
            adoptPrice: cleanPrice(s.adoptPrice || 0)
          };
        });

        setStocks(safeStocks);
        saveStocks(safeStocks);
        setTabs(safeTabs);

        const indicesRes = await fetchMarketIndicesProfile();
        setMarketIndices({ nikkei: indicesRes.nikkei, topix: indicesRes.topix });
        if (indicesRes.refDates) {
          setMarketRefDates(indicesRes.refDates);
        }

        updateAllStocksRealDataSequentially(safeStocks, indicesRes.refDates || undefined);
      } catch (err) {
        console.error('Failed to initialize stock app data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [updateAllStocksRealDataSequentially]);

  const handleForceRefreshAll = async () => {
    if (isSyncingRef.current) return;
    const indicesRes = await fetchMarketIndicesProfile();
    setMarketIndices({ nikkei: indicesRes.nikkei, topix: indicesRes.topix });
    if (indicesRes.refDates) {
      setMarketRefDates(indicesRes.refDates);
    }
    await updateAllStocksRealDataSequentially(stocks, indicesRes.refDates || undefined);
  };

  const handleForceWipeAndRefresh = async () => {
    isSyncingRef.current = false;
    const indicesRes = await fetchMarketIndicesProfile();
    setMarketIndices({ nikkei: indicesRes.nikkei, topix: indicesRes.topix });
    if (indicesRes.refDates) {
      setMarketRefDates(indicesRes.refDates);
    }
    await updateAllStocksRealDataSequentially(stocks, indicesRes.refDates || undefined);
  };

  const handleAddStock = (newStock: StockItem) => {
    if (isReadOnly) return;
    const updated = [{ ...newStock, tabId: activeTabId }, ...stocks];
    setStocks(updated);
    saveStocks(updated);
    updateAllStocksRealDataSequentially([{ ...newStock, tabId: activeTabId }]);
  };

  const handleDeleteStock = (stockId: string) => {
    if (isReadOnly) return;
    const updated = stocks.filter((s) => s.id !== stockId);
    setStocks(updated);
    saveStocks(updated);
    if (selectedStock && selectedStock.id === stockId) {
      setSelectedStock(null);
    }
  };

  const handleUpdateStock = (updatedStock: StockItem) => {
    if (isReadOnly) return;
    const updated = stocks.map((s) => (s.id === updatedStock.id ? updatedStock : s));
    setStocks(updated);
    saveStocks(updated);
    if (selectedStock && selectedStock.id === updatedStock.id) {
      setSelectedStock(updatedStock);
    }
  };

  const currentTabStocks = (stocks || []).filter((s) => s.tabId === activeTabId);

  if (isLinkExpired) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0b0f19',
        color: '#fff',
        fontFamily: 'sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444',
          borderRadius: '16px',
          padding: '40px 30px',
          maxWidth: '500px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)'
        }}>
          <Lock size={60} style={{ color: '#ef4444', marginBottom: '20px', marginLeft: 'auto', marginRight: 'auto' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>共有リンクの有効期限切れ</h2>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#cbd5e1', marginBottom: '24px' }}>
            この共有閲覧用URLはセキュリティ保護のため、有効期限（月末）が経過して無効化されています。
            <br />
            今月の新しい共有閲覧用URLを発行し直すよう、管理者に請求してください。
          </p>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Security System Locked
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />

      {isReadOnly && (
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.25)',
            border: '2px solid #eab308',
            color: '#facc15',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(234, 179, 8, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} />
            <span>👁 【閲覧専用 (Read-Only) モードでアクセス中】 銘柄の追加・削除・データ修正機能は保護ロックされています。</span>
          </div>
          <a
            href={editorUrl}
            style={{
              background: '#38bdf8',
              color: '#0f172a',
              padding: '6px 14px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 800
            }}
          >
            ✏️ 編集許可モードで開く
          </a>
        </div>
      )}

      {/* ヘッダー */}
      <Header
        stocks={stocks || []}
        isReadOnly={isReadOnly}
      />

      {/* 同期中リアルタイムプログレスバー */}
      {syncProgress && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid var(--accent-cyan)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(56, 189, 248, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="animate-spin" style={{ display: 'inline-block', fontSize: '1.1rem' }}>🔄</span>
            <span>【最新株価同期中】 キャッシュを自動クリアし、全銘柄の株価データを最新に再取得しています... ({syncProgress.current} / {syncProgress.total} 銘柄)</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 900 }}>
            {Math.round((syncProgress.current / syncProgress.total) * 100)}% 完了
          </div>
        </div>
      )}

      {/* メインコンテンツエリア */}
      <main className="main-content">
        <TabNavigation
          tabs={tabs || DEFAULT_TABS}
          activeTabId={activeTabId}
          stocks={stocks || []}
          isReadOnly={isReadOnly}
          onSelectTab={setActiveTabId}
          onAddTab={(name) => {
            if (isReadOnly) return;
            const newTab: TabConfig = { id: `tab-${Date.now()}`, name, description: '' };
            const updatedTabs = [...(tabs || []), newTab];
            setTabs(updatedTabs);
            saveTabs(updatedTabs);
            setActiveTabId(newTab.id);
          }}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px', fontSize: '1.5rem' }}>⌛</div>
            <div>最新の株価データを同期中...</div>
          </div>
        ) : (
          <StockTable
            stocks={currentTabStocks}
            tabs={tabs || DEFAULT_TABS}
            isReadOnly={isReadOnly}
            onSelectStock={setSelectedStock}
            onDeleteStock={handleDeleteStock}
            onUpdateStock={handleUpdateStock}
          />
        )}

        {/* 市場比較タイル (日経平均・TOPIX・30銘柄平均) をフッター直上に配置 */}
        <MarketOverviewTiles
          nikkei={marketIndices.nikkei}
          topix={marketIndices.topix}
          stocks={stocks || []}
        />

        {/* フッター */}
        <Footer
          isReadOnly={isReadOnly}
          isSyncing={!!syncProgress}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onExportJSON={() => exportDataAsJSON(stocks || [], tabs || [])}
          onRefreshAllStocks={handleForceRefreshAll}
          onOpenDebugModal={() => setIsDebugModalOpen(true)}
        />
      </main>

      {/* モーダル群 */}
      {isAddModalOpen && !isReadOnly && (
        <AddStockModal
          tabs={tabs || DEFAULT_TABS}
          currentTabId={activeTabId}
          onClose={() => setIsAddModalOpen(false)}
          onAddStock={handleAddStock}
        />
      )}

      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          isReadOnly={isReadOnly}
          onClose={() => setSelectedStock(null)}
          onUpdateStock={handleUpdateStock}
        />
      )}

      {isShareModalOpen && (
        <ShareConfigModal
          tabs={tabs || DEFAULT_TABS}
          stocks={stocks || []}
          settings={settings}
          isReadOnly={isReadOnly}
          onClose={() => setIsShareModalOpen(false)}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            saveSyncSettings(newSettings);
          }}
          onExportJSON={() => exportDataAsJSON(stocks || [], tabs || [])}
          onImportJSONClick={() => fileInputRef.current?.click()}
        />
      )}

      <DebugModal
        isOpen={isDebugModalOpen}
        stocks={stocks || []}
        refDates={marketRefDates}
        onClose={() => setIsDebugModalOpen(false)}
        onForceWipeAndRefresh={handleForceWipeAndRefresh}
      />
    </div>
  );
};
