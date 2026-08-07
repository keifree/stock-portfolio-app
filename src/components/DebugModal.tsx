import React, { useState } from 'react';
import { StockItem } from '../types';
import { MarketReferenceDates, fetchJpStockFullProfile, fetchMarketIndicesProfile } from '../services/yahooFinance';
import { X, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Database, Search } from 'lucide-react';

interface DebugModalProps {
  isOpen: boolean;
  stocks: StockItem[];
  refDates: MarketReferenceDates | null;
  onClose: () => void;
  onForceWipeAndRefresh: () => Promise<void>;
}

export const DebugModal: React.FC<DebugModalProps> = ({
  isOpen,
  stocks,
  refDates,
  onClose,
  onForceWipeAndRefresh
}) => {
  const [selectedCode, setSelectedCode] = useState<string>('1605'); // デフォルト INPEX
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isWiping, setIsWiping] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentStock = stocks.find((s) => s.code.includes(selectedCode) || selectedCode.includes(s.code));

  const handleRunLiveTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const indices = await fetchMarketIndicesProfile();
      const profile = await fetchJpStockFullProfile(selectedCode, undefined, indices.refDates || undefined);
      setTestResult({
        refDates: indices.refDates,
        profile,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e: any) {
      setTestResult({ error: e.message || '取得失敗' });
    } finally {
      setTesting(false);
    }
  };

  const handleWipeClick = async () => {
    if (!window.confirm("古いキャシュデータを完全に破棄し、プロキシ外側キャッシュ無効化付きで全109銘柄を完全最新同期しますか？")) {
      return;
    }
    setIsWiping(true);
    try {
      await onForceWipeAndRefresh();
      alert("全銘柄の株価を最新確定値へ正常に完全更新いたしました！");
      onClose();
    } catch (e) {
      alert("同期中にエラーが発生しました");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '92%', padding: '24px', borderRadius: '16px' }}
      >
        {/* モーダルヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔍</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#fff' }}>
              リアルタイム通信デバッグ ＆ キャッシュクリア診断
            </h2>
          </div>
          <button className="btn-close" onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* 1. 現在の市場基準日パネル */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--accent-cyan)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} /> 統一市場基準日 (大成建設・日経平均参照軸)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', fontSize: '0.8rem' }}>
            <div>現在値基準: <strong style={{ color: '#fff' }}>{refDates?.currentDate || '2026-08-07'}</strong></div>
            <div>前日比基準: <strong style={{ color: '#fff' }}>{refDates?.prev1Date || '2026-08-06'}</strong></div>
            <div>5日比基準: <strong style={{ color: '#fff' }}>{refDates?.prev5Date || '2026-07-31'}</strong></div>
            <div>20日比基準: <strong style={{ color: '#fff' }}>{refDates?.prev20Date || '2026-07-09'}</strong></div>
          </div>
        </div>

        {/* 2. 銘柄ライブ診断エリア */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
            銘柄生のリアルタイム取得検証
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              className="input-field"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              placeholder="銘柄コード (例: 1605, 6525, 1801)"
              style={{ width: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
            />
            <button className="btn btn-secondary" onClick={handleRunLiveTest} disabled={testing} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              <Search size={14} />
              <span>{testing ? '生取得中...' : '生API通信テスト'}</span>
            </button>
          </div>

          {currentStock && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              画面表示中の値 ({currentStock.name} [{currentStock.code}]):
              <span style={{ color: '#facc15', marginLeft: '6px', fontWeight: 800 }}>
                現在値: ¥{currentStock.currentPrice?.toLocaleString()} | 前日比: {currentStock.changePrevPct}% | 5日比: {currentStock.change5dPct}% | 20日比: {currentStock.change20dPct}%
              </span>
            </div>
          )}

          {testResult && testResult.profile && (
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-cyan)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
              <div style={{ color: '#34d399', fontWeight: 800, marginBottom: '4px' }}>
                ✅ API生データ取得成功 (取得時刻: {testResult.timestamp})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#fff' }}>
                <div>現在値 (8/7): <strong>¥{testResult.profile.currentPrice?.toLocaleString()}</strong></div>
                <div>前日終値 (8/6): <strong>¥{testResult.profile.previousPrice?.toLocaleString()}</strong></div>
                <div>5日前終値 (7/31): <strong>¥{testResult.profile.price5DaysAgo?.toLocaleString()}</strong></div>
                <div>20日前終値 (7/9): <strong>¥{testResult.profile.price20DaysAgo?.toLocaleString()}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* 3. キャッシュ完全クリア ＆ 強制全同期アクション */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '340px' }}>
            外部プロキシのエッジキャッシュを全破棄し、画面上の表示を100%最新確定値へ強制同期します。
          </div>
          <button
            className="btn btn-primary"
            onClick={handleWipeClick}
            disabled={isWiping}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              borderColor: 'var(--accent-cyan)',
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 800
            }}
          >
            <RefreshCw size={15} className={isWiping ? 'animate-spin' : ''} />
            <span>{isWiping ? '完全破棄同期中...' : '⚡ キャッシュ破棄＆全最新同期'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
