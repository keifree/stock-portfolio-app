import React, { useEffect, useState, useRef } from 'react';
import { StockItem, TabConfig, SyncSettings } from './types';
import { getAutoTseJapaneseInfo } from './services/tseMaster';
import {
  initializeDefaultData,
  saveStocks,
  saveTabs,
  getSyncSettings,
  saveSyncSettings,
  exportDataAsCSV,
  exportDataAsJSON,
  parseAndImportCSV,
  parseAndImportJSON,
  DEFAULT_TABS
} from './services/storage';

import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { StockTable } from './components/StockTable';
import { AddStockModal } from './components/AddStockModal';
import { StockDetailModal } from './components/StockDetailModal';
import { ShareConfigModal } from './components/ShareConfigModal';
import { fetchJpStockFullProfile } from './services/yahooFinance';
import { Eye, Edit3, Check, Lock, ShieldCheck, Upload, RefreshCw } from 'lucide-react';

// 指定ミリ秒待機するスリープ関数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const App: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [tabs, setTabs] = useState<TabConfig[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-30');
  const [settings, setSettings] = useState<SyncSettings>({ autoSync: false, syncIntervalMinutes: 5, apiEndpoint: '' });
  const [loading, setLoading] = useState<boolean>(true);

  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isLinkExpired, setIsLinkExpired] = useState<boolean>(false); // 共有リンクの有効期限切れ状態
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const editorUrl = baseUrl;

  // 当月のキーを動的生成 (共有URL用)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const currentKey = btoa(`stock-${yyyy}-${mm}`).substring(0, 8);
  const readonlyUrl = `${baseUrl}?mode=readonly&key=${currentKey}`;

  const copyUrl = (url: string, type: 'readonly' | 'editor') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleResetData = () => {
    try {
      localStorage.removeItem('stock_portfolio_tabs_v2');
      localStorage.removeItem('stock_portfolio_settings_v2');
      localStorage.removeItem('stock_portfolio_backup_snapshot');
      window.location.href = window.location.origin + window.location.pathname;
    } catch (e) {
      // ignore
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let res: { success: boolean; count: number; stocks: StockItem[] } = { success: false, count: 0, stocks: [] };

      if (file.name.endsWith('.json')) {
        res = parseAndImportJSON(content);
      } else {
        res = parseAndImportCSV(content);
      }

      if (res.success && res.stocks.length > 0) {
        setStocks(res.stocks);
        alert(`【読み込み成功】\nCSVファイルから銘柄データ [ ${res.count}件 ] をインポート復元しました。\nこれからバックグラウンドで時間を分散させて本物の株価と同期します。`);
        
        // インポート直後に時間を分散して安全にYahoo Financeとリアルタイム同期
        await updateAllStocksRealDataSequentially(res.stocks);
      } else {
        alert('ファイルの読み込みに失敗しました。');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

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
          
          // 当月の検証トークンキーと比較
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
        // ignore
      }
    }

    async function load() {
      try {
        const { stocks: loadedStocks, tabs: loadedTabs } = await initializeDefaultData();
        let safeStocks = Array.isArray(loadedStocks) ? loadedStocks : [];
        const safeTabs = Array.isArray(loadedTabs) && loadedTabs.length > 0 ? loadedTabs : DEFAULT_TABS;

        // 既存データの中にある明らかな異常値 (90円や0.63円など) を自動検知して0(非表示)に自動クレンジング
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
        setTabs(safeTabs);

        // バックグラウンドで時間を分散（スリープ遅延）させてクローラー制限を回避しながら本物のデータを同期
        updateAllStocksRealDataSequentially(safeStocks);
      } catch (err) {
        console.error('Failed to initialize stock app data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /**
   * クローラー制限（アクセスブロック）を回避するため、
   * GASの知恵と同様にウェイト(Sleep)を挟みながら、1銘柄ずつ順次同期処理を行う関数
   */
  const updateAllStocksRealDataSequentially = async (targetsToUpdate: StockItem[]) => {
    if (!targetsToUpdate || targetsToUpdate.length === 0) return;
    
    for (let i = 0; i < targetsToUpdate.length; i++) {
      const stock = targetsToUpdate[i];
      
      // GASの知恵: 連続アクセスを避けるため、リクエスト間に 150ms〜350ms のランダムスリープを挿入
      const randomWait = Math.floor(Math.random() * 200) + 150;
      await sleep(randomWait);
      
      try {
        const real = await fetchJpStockFullProfile(stock.code, stock.adoptDate);
        if (real && real.currentPrice > 5) { // 異常値ガード
          
          const changePrevPct = Number((((real.currentPrice - real.previousPrice) / real.previousPrice) * 100).toFixed(2));
          const change5dPct = Number((((real.currentPrice - real.price5DaysAgo) / real.price5DaysAgo) * 100).toFixed(2));
          const change20dPct = Number((((real.currentPrice - real.price20DaysAgo) / real.price20DaysAgo) * 100).toFixed(2));
          const changeYtdPct = Number((((real.currentPrice - real.priceYearStart) / real.priceYearStart) * 100).toFixed(2));

          const adoptPrice = real.adoptPrice || stock.adoptPrice || real.currentPrice;
          const changeAdoptPct = adoptPrice > 0 ? Number((((real.currentPrice - adoptPrice) / adoptPrice) * 100).toFixed(2)) : 0;

          // バグ修正箇所：引数で渡されたリストだけでなく、「アプリ全体の全銘柄の状態」を安全に部分更新
          setStocks((prevStocks) => {
            const updated = prevStocks.map((s) => {
              if (s.code === stock.code) {
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
                  changeAdoptPct
                };
              }
              return s;
            });
            saveStocks(updated); // ローカルストレージにもアプリ全体データを保存
            return updated;
          });
        }
      } catch (err) {
        console.error(`Sequencing fetch failed for stock: ${stock.code}`, err);
      }
    }
  };

  const handleAddStock = (newStock: StockItem) => {
    if (isReadOnly) return;
    const updated = [{ ...newStock, tabId: activeTabId }, ...stocks];
    setStocks(updated);
    saveStocks(updated);
    // 新規登録したその1銘柄だけを、既存の他の銘柄を破壊せずにバックグラウンドで安全同期
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
      {/* 非表示のファイル入力欄のみDOM上に保持 */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv, .json"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />

      {/* 閲覧専用モード警告バー */}
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
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onExportCSV={() => exportDataAsCSV(stocks || [])}
        onExportJSON={() => exportDataAsJSON(stocks || [], tabs || [])}
      />

      {/* メインコンテンツエリア */}
      <main className="main-content">
        <TabNavigation
          tabs={tabs || DEFAULT_TABS}
          activeTabId={activeTabId}
          stocks={stocks || []}
          onSelectTab={setActiveTabId}
          onAddTab={(name) => {
            if (isReadOnly) return;
            const newTab: TabConfig = { id: `tab-${Date.now()}`, name, description: '' };
            const updatedTabs = [...(tabs || []), newTab];
            setTabs(updatedTabs);
            saveTabs(updatedTabs);
            setActiveTabId(newTab.id);
          }}
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
          onExportCSV={() => exportDataAsCSV(stocks || [])}
          onExportJSON={() => exportDataAsJSON(stocks || [], tabs || [])}
          onImportCSVClick={() => fileInputRef.current?.click()} // CSV読み込みトリガーの連結
        />
      )}
    </div>
  );
};
