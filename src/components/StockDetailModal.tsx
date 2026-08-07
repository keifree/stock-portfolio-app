import React, { useState } from 'react';
import { StockItem, FinancialQuarterNote, FeatureNote, DistributionComment } from '../types';
import { getAutoTseJapaneseInfo } from '../services/tseMaster';
import { FinancialNotes } from './FinancialNotes';
import { FeatureNotes } from './FeatureNotes';
import { DistributionComments } from './DistributionComments';
import { X, FileText, MessageSquare, BookOpen, Send, Calendar, Search } from 'lucide-react';

interface StockDetailModalProps {
  stock: StockItem;
  isReadOnly?: boolean;
  onClose: () => void;
  onUpdateStock: (updatedStock: StockItem) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  stock,
  isReadOnly = false,
  onClose,
  onUpdateStock
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'logs' | 'features' | 'distribution'>('financial');

  // ログ用フィルター・検索ステート
  const [logSelectedYear, setLogSelectedYear] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  const handleUpdateFinancialNotes = (notes: FinancialQuarterNote[]) => {
    if (isReadOnly) return;
    const updated = {
      ...stock,
      financialNotes: notes,
      updatedAt: new Date().toISOString()
    };
    onUpdateStock(updated);
  };

  const handleUpdateFeatureNotes = (notes: FeatureNote[]) => {
    if (isReadOnly) return;
    const updated = {
      ...stock,
      featureNotes: notes,
      updatedAt: new Date().toISOString()
    };
    onUpdateStock(updated);
  };

  const handleUpdateDistributionComments = (comments: DistributionComment[]) => {
    if (isReadOnly) return;
    const updated = {
      ...stock,
      distributionComments: comments,
      updatedAt: new Date().toISOString()
    };
    onUpdateStock(updated);
  };

  const renderChart = () => {
    if (!stock.chartHistory || stock.chartHistory.length === 0) return null;
    const points = stock.chartHistory;
    const prices = points.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;

    const width = 600;
    const height = 140;
    const padding = 15;

    const svgPoints = points.map((p, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.price - minPrice) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const strokeColor = stock.changePrevPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)';

    return (
      <div style={{ marginTop: '16px', background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span>直近株価推移 (30営業日)</span>
          <span>高値: ¥{maxPrice.toLocaleString()} / 安値: ¥{minPrice.toLocaleString()}</span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '140px', overflow: 'visible' }}>
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPoints.join(' ')}
          />
        </svg>
      </div>
    );
  };

  const renderLogsTab = () => {
    const rawLogs = stock.irComments || [];
    const logAvailableYears = Array.from(
      new Set(
        rawLogs
          .map((l) => {
            const match = (l.date || '').match(/^(\d{4})/);
            return match ? match[1] : null;
          })
          .filter((y): y is string => y !== null)
      )
    ).sort((a, b) => b.localeCompare(a));

    const filteredLogs = rawLogs.filter((l) => {
      const d = l.date || '';
      if (logSelectedYear !== 'ALL' && !d.startsWith(logSelectedYear)) return false;
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.trim().toLowerCase();
        const t = (l.title || '').toLowerCase();
        const c = (l.content || '').toLowerCase();
        const a = (l.author || '').toLowerCase();
        if (!t.includes(q) && !c.includes(q) && !a.includes(q)) return false;
      }
      return true;
    });

    const sortedLogs = [...filteredLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return (
      <div className="glass-card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>
            各種ログ一覧 ({rawLogs.length}件)
          </h3>
        </div>

        {/* フィルター・検索コントロールバー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            {/* 年数絞り込み */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} style={{ color: 'var(--accent-cyan)' }} />
              <select
                className="input-field"
                value={logSelectedYear}
                onChange={(e) => setLogSelectedYear(e.target.value)}
                style={{ padding: '5px 10px', fontSize: '0.82rem' }}
              >
                <option value="ALL">📅 すべての年 ({rawLogs.length}件)</option>
                {logAvailableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}年
                  </option>
                ))}
              </select>
            </div>

            {/* キーワード検索 */}
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="ログ内容で検索..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px', paddingRight: logSearchQuery ? '26px' : '10px', fontSize: '0.82rem', width: '100%' }}
              />
              {logSearchQuery && (
                <button
                  onClick={() => setLogSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ヒット件数 ＆ クリアボタン */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span>
              表示: <strong style={{ color: '#fff' }}>{sortedLogs.length}</strong> / {rawLogs.length} 件
            </span>
            {(logSelectedYear !== 'ALL' || logSearchQuery) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setLogSelectedYear('ALL');
                  setLogSearchQuery('');
                }}
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                クリア
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedLogs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              条件に一致するログは見つかりませんでした。
            </div>
          ) : (
            sortedLogs.map((log) => (
              <div key={log.id} style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{log.date}</span>
                  <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>{log.title}</span>
                  <span>記録者: {log.author || 'システム'}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {log.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const autoTse = getAutoTseJapaneseInfo(stock.code, stock.name);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="code-badge" style={{ fontSize: '1rem', padding: '4px 10px' }}>{stock.code}</span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{autoTse.name}</h2>
              <span className={`scale-badge ${stock.scale}`}>{stock.scale}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              セクター: {autoTse.sector} | 時価総額: {stock.marketCap.toLocaleString()}億円
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          {/* 基本指標グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>現在価格</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }} className="price-num">
                ¥{stock.currentPrice.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>前日比</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: stock.changePrevPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                {stock.changePrevPct >= 0 ? `+${stock.changePrevPct}%` : `${stock.changePrevPct}%`}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>5営業日比</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: stock.change5dPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                {stock.change5dPct >= 0 ? `+${stock.change5dPct}%` : `${stock.change5dPct}%`}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>20営業日比</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: stock.change20dPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                {stock.change20dPct >= 0 ? `+${stock.change20dPct}%` : `${stock.change20dPct}%`}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>年始比</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: stock.changeYtdPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                {stock.changeYtdPct >= 0 ? `+${stock.changeYtdPct}%` : `${stock.changeYtdPct}%`}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>採用時比 ({stock.adoptDate})</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: stock.changeAdoptPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                {stock.changeAdoptPct >= 0 ? `+${stock.changeAdoptPct}%` : `${stock.changeAdoptPct}%`}
              </div>
            </div>
          </div>

          {/* ミニチャート */}
          {renderChart()}

          {/* サブナビゲーション */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', marginTop: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              className={`btn ${activeSubTab === 'financial' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('financial')}
            >
              <FileText size={15} />
              <span>決算・IRコメント ({stock.financialNotes?.length || 0})</span>
            </button>
            <button
              className={`btn ${activeSubTab === 'distribution' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('distribution')}
            >
              <Send size={15} />
              <span>配信コメント ({(stock.distributionComments || []).length})</span>
            </button>
            <button
              className={`btn ${activeSubTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('logs')}
            >
              <MessageSquare size={15} />
              <span>各種ログ一覧 ({stock.irComments?.length || 0})</span>
            </button>
            <button
              className={`btn ${activeSubTab === 'features' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('features')}
            >
              <BookOpen size={15} />
              <span>銘柄特徴・分析 ({(stock.featureNotes || []).length})</span>
            </button>
          </div>

          {/* サブコンテンツ表示 */}
          {activeSubTab === 'financial' && (
            <FinancialNotes 
              notes={stock.financialNotes || []} 
              onUpdateNotes={handleUpdateFinancialNotes} 
              isReadOnly={isReadOnly}
            />
          )}

          {activeSubTab === 'distribution' && (
            <DistributionComments
              comments={stock.distributionComments || []}
              onUpdateComments={handleUpdateDistributionComments}
              isReadOnly={isReadOnly}
            />
          )}

          {activeSubTab === 'logs' && renderLogsTab()}

          {activeSubTab === 'features' && (
            <FeatureNotes 
              notes={stock.featureNotes || []} 
              onUpdateNotes={handleUpdateFeatureNotes} 
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      </div>
    </div>
  );
};
