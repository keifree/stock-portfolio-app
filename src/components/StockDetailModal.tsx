import React, { useState } from 'react';
import { StockItem, FinancialQuarterNote, IRComment } from '../types';
import { getAutoTseJapaneseInfo } from '../services/tseMaster';
import { FinancialNotes } from './FinancialNotes';
import { IRComments } from './IRComments';
import { X, FileText, MessageSquare, Info } from 'lucide-react';

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
  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'ir' | 'info'>('financial');

  const handleUpdateFinancialNotes = (notes: FinancialQuarterNote[]) => {
    if (isReadOnly) return;
    const updated = {
      ...stock,
      financialNotes: notes,
      updatedAt: new Date().toISOString()
    };
    onUpdateStock(updated);
  };

  const handleUpdateIRComments = (comments: IRComment[]) => {
    if (isReadOnly) return;
    const updated = {
      ...stock,
      irComments: comments,
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
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', marginTop: '24px', marginBottom: '20px' }}>
            <button
              className={`btn ${activeSubTab === 'financial' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('financial')}
            >
              <FileText size={15} />
              <span>各期決算メモ ({stock.financialNotes.length})</span>
            </button>
            <button
              className={`btn ${activeSubTab === 'ir' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('ir')}
            >
              <MessageSquare size={15} />
              <span>IRコメント・分析 ({stock.irComments.length})</span>
            </button>
            <button
              className={`btn ${activeSubTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('info')}
            >
              <Info size={15} />
              <span>全指標一覧</span>
            </button>
          </div>

          {/* サブコンテンツ表示 */}
          {activeSubTab === 'financial' && (
            <FinancialNotes notes={stock.financialNotes} onUpdateNotes={handleUpdateFinancialNotes} />
          )}

          {activeSubTab === 'ir' && (
            <IRComments comments={stock.irComments} onUpdateComments={handleUpdateIRComments} />
          )}

          {activeSubTab === 'info' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>全データ・基準価格詳細</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.88rem' }}>
                <div><strong>銘柄コード:</strong> {stock.code}</div>
                <div><strong>銘柄名:</strong> {autoTse.name}</div>
                <div><strong>現在価格:</strong> ¥{stock.currentPrice.toLocaleString()}</div>
                <div><strong>前日価格:</strong> ¥{stock.previousPrice.toLocaleString()} ({stock.changePrevPct}%)</div>
                <div><strong>5日前価格:</strong> ¥{stock.price5DaysAgo.toLocaleString()} ({stock.change5dPct}%)</div>
                <div><strong>20日前価格:</strong> ¥{stock.price20DaysAgo.toLocaleString()} ({stock.change20dPct}%)</div>
                <div><strong>年始価格:</strong> ¥{stock.priceYearStart.toLocaleString()} ({stock.changeYtdPct}%)</div>
                <div><strong>銘柄採用日:</strong> {stock.adoptDate}</div>
                <div><strong>採用時価格:</strong> ¥{stock.adoptPrice.toLocaleString()} ({stock.changeAdoptPct}%)</div>
                <div><strong>セクター:</strong> {autoTse.sector}</div>
                <div><strong>時価総額:</strong> {stock.marketCap.toLocaleString()}億円</div>
                <div><strong>株価規模感:</strong> <span className={`scale-badge ${stock.scale}`}>{stock.scale}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
