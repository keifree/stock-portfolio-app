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
import { Eye, Edit3, Check, Lock, ShieldCheck, Upload, Calendar } from 'lucide-react';

export const App: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [tabs, setTabs] = useState<TabConfig[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-30');
  const [settings, setSettings] = useState<SyncSettings>({ autoSync: false, syncIntervalMinutes: 5, apiEndpoint: '' });
  const [loading, setLoading] = useState<boolean>(true);

  // 閲覧権限モード判定 (?mode=readonly または ?role=viewer または ?readonly)
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // モーダル表示状態
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const readonlyUrl = `${baseUrl}?mode=readonly`;
  const editorUrl = baseUrl;

  const copyUrl = (url: string, type: 'readonly' | 'editor') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  // 全銘柄の採用日一括変更補正機能
  const handleBulkUpdateAdoptDate = () => {
    const inputDate = window.prompt('全銘柄に適用する「採用日」をYYYY-MM-DD形式で入力してください', '2024-08-01');
    if (!inputDate) return;

    const updated = stocks.map((s) => {
      let newPrice = s.adoptPrice;
      if (s.chartHistory && s.chartHistory.length > 0) {
        const pt = s.chartHistory.find((p) => p.date === inputDate) || s.chartHistory.slice().reverse().find((p) => p.date <= inputDate);
        if (pt) newPrice = pt.price;
      }
      const changeAdoptPct = newPrice > 0 ? Number((((s.currentPrice - newPrice) / newPrice) * 100).toFixed(2)) : 0;
      return {
        ...s,
        adoptDate: inputDate,
        adoptPrice: newPrice,
        changeAdoptPct
      };
    });

    setStocks(updated);
    saveStocks(updated);
    alert(`【採用日の一括補正完了】\n全 ${updated.length} 件の採用日を [ ${inputDate} ] に補正更新いたしました！`);
  };

  // 保存済みCSV/JSONファイルの一括インポート取り込み
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
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
        alert(`【読み込み成功】\nCSV/JSONファイルから本物の銘柄データ [ ${res.count}件 ] を無事復元インポートいたしました！`);
      } else {
        alert('ファイルの読み込みに失敗しました。フォーマットを確認してください。');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  useEffect(() => {
    // URLクエリパラメータから権限モード判定
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const role = params.get('role');
      if (mode === 'readonly' || role === 'viewer' || mode === 'view' || params.has('readonly')) {
        setIsReadOnly(true);
      }
    }

    async function load() {
      try {
        const { stocks: loadedStocks, tabs: loadedTabs } = await initializeDefaultData();
        const fullyCleaned = (loadedStocks || []).map((s) => {
          const info = getAutoTseJapaneseInfo(s.code, s.name);
          return { ...s, name: info.name, sector: info.sector };
        });
        setStocks(fullyCleaned);
        saveStocks(fullyCleaned);
        setTabs(loadedTabs || DEFAULT_TABS);
        
        try {
          const currentSettings = getSyncSettings();
          setSettings(currentSettings);
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.error('Failed to initialize stock app data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 銘柄追加
  const handleAddStock = (newStock: StockItem) => {
    if (isReadOnly) return;
    const updated = [{ ...newStock, tabId: activeTabId }, ...stocks];
    setStocks(updated);
    saveStocks(updated);
  };

  // 銘柄削除
  const handleDeleteStock = (stockId: string) => {
    if (isReadOnly) return;
    const updated = stocks.filter((s) => s.id !== stockId);
    setStocks(updated);
    saveStocks(updated);
    if (selectedStock && selectedStock.id === stockId) {
      setSelectedStock(null);
    }
  };

  // 銘柄更新
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

  return (
    <div className="app-container">
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

      {/* 画面中央最優先設置：権限共有 ＆ CSV復元＆採用日補正コントロールパネル */}
      <div className="glass-card" style={{ padding: '12px 18px', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>共有 ＆ CSV復元・採用日補正パネル:</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv, .json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />

            {/* 📥 CSVファイルの読み込みボタン */}
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 800, padding: '6px 14px' }}
              title="保存したCSVまたはJSONファイルを選択して登録データを一括復元します"
            >
              <Upload size={16} />
              <span>📥 CSVファイルを読み込んで復元</span>
            </button>

            {/* 📅 全銘柄の採用日一括変更ボタン */}
            {!isReadOnly && (
              <button
                className="btn btn-secondary"
                onClick={handleBulkUpdateAdoptDate}
                style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)', fontSize: '0.78rem' }}
                title="全銘柄の採用日を指定の過去日付に一括で補正変更します"
              >
                <Calendar size={14} />
                <span>📅 採用日を一括変更</span>
              </button>
            )}

            {/* 1. 閲覧専用URLコピーボタン */}
            <button
              className="btn btn-secondary"
              onClick={() => copyUrl(readonlyUrl, 'readonly')}
              style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.3)', fontSize: '0.78rem' }}
            >
              {copiedType === 'readonly' ? <Check size={14} /> : <Eye size={14} />}
              <span>{copiedType === 'readonly' ? '閲覧URLコピー完了' : '👁 閲覧専用URL'}</span>
            </button>

            {/* 2. 編集許可URLコピーボタン */}
            <button
              className="btn btn-secondary"
              onClick={() => copyUrl(editorUrl, 'editor')}
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', borderColor: 'rgba(56, 189, 248, 0.3)', fontSize: '0.78rem' }}
            >
              {copiedType === 'editor' ? <Check size={14} /> : <Edit3 size={14} />}
              <span>{copiedType === 'editor' ? '編集URLコピー完了' : '✏️ 編集許可URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <main className="main-content">
        {/* タブナビゲーション */}
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

        {/* 読み込み中・銘柄テーブル表示 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px', fontSize: '1.5rem' }}>⌛</div>
            <div>最新の株価データを公式時系列APIより同期中...</div>
          </div>
        ) : (
          <StockTable
            stocks={currentTabStocks}
            isReadOnly={isReadOnly}
            onSelectStock={setSelectedStock}
            onDeleteStock={handleDeleteStock}
          />
        )}
      </main>

      {/* 1. 銘柄追加モーダル */}
      {isAddModalOpen && !isReadOnly && (
        <AddStockModal
          tabs={tabs || DEFAULT_TABS}
          currentTabId={activeTabId}
          onClose={() => setIsAddModalOpen(false)}
          onAddStock={handleAddStock}
        />
      )}

      {/* 2. 銘柄詳細モーダル */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          isReadOnly={isReadOnly}
          onClose={() => setSelectedStock(null)}
          onUpdateStock={handleUpdateStock}
        />
      )}

      {/* 3. 設定・共有モーダル */}
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
        />
      )}
    </div>
  );
};
