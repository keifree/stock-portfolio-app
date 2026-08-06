import React, { useState } from 'react';
import { StockItem, FinancialQuarterNote, IRComment, FeatureNote } from '../types';
import { getAutoTseJapaneseInfo } from '../services/tseMaster';
import { FinancialNotes } from './FinancialNotes';
import { FeatureNotes } from './FeatureNotes';
import { X, FileText, MessageSquare, BookOpen, Lock } from 'lucide-react';

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
  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'logs' | 'features'>('financial');

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

          {activeSubTab === 'logs' && (
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-cyan)' }}>各種ログ一覧 ({stock.irComments?.length || 0}件)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(stock.irComments || []).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    現在記録されている移動・採用履歴ログはありません。
                  </div>
                ) : (
                  [...(stock.irComments || [])]
                    .sort((a, b) => b.date.localeCompare(a.date)) // 日付の新しい順
                    .map((log) => (
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
          )}

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
