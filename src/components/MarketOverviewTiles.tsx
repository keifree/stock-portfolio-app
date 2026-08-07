import React from 'react';
import { StockItem } from '../types';
import { MarketIndexMetrics } from '../services/yahooFinance';
import { TrendingUp, BarChart2, Activity } from 'lucide-react';

interface MarketOverviewTilesProps {
  nikkei: MarketIndexMetrics | null;
  topix: MarketIndexMetrics | null;
  stocks: StockItem[];
}

export const MarketOverviewTiles: React.FC<MarketOverviewTilesProps> = ({
  nikkei,
  topix,
  stocks
}) => {
  // 30銘柄平均の計算 (tab-30 に所属する銘柄、または対象がなければ全銘柄)
  const target30Stocks = stocks.filter((s) => s.tabId === 'tab-30');
  const activeStocks = target30Stocks.length > 0 ? target30Stocks : stocks;

  const calculate30AvgMetrics = () => {
    if (!activeStocks || activeStocks.length === 0) return null;
    const n = activeStocks.length;

    const sumCurrent = activeStocks.reduce((acc, s) => acc + (s.currentPrice || 0), 0);
    const sumPrev = activeStocks.reduce((acc, s) => acc + (s.previousPrice || s.currentPrice || 0), 0);
    const sum5d = activeStocks.reduce((acc, s) => acc + (s.price5DaysAgo || s.previousPrice || s.currentPrice || 0), 0);
    const sum20d = activeStocks.reduce((acc, s) => acc + (s.price20DaysAgo || s.previousPrice || s.currentPrice || 0), 0);
    const sumYtd = activeStocks.reduce((acc, s) => acc + (s.priceYearStart || s.previousPrice || s.currentPrice || 0), 0);

    const c = sumCurrent / n;
    const prev = sumPrev / n;
    const p5 = sum5d / n;
    const p20 = sum20d / n;
    const pytd = sumYtd / n;

    return {
      name: '30銘柄平均',
      symbol: `対象: ${n}銘柄`,
      currentPrice: Number(c.toFixed(2)),
      previousPrice: Number(prev.toFixed(2)),
      changePrevVal: Number((c - prev).toFixed(2)),
      changePrevPct: prev > 0 ? Number((((c - prev) / prev) * 100).toFixed(2)) : 0,
      price5DaysAgo: Number(p5.toFixed(2)),
      change5dVal: Number((c - p5).toFixed(2)),
      change5dPct: p5 > 0 ? Number((((c - p5) / p5) * 100).toFixed(2)) : 0,
      price20DaysAgo: Number(p20.toFixed(2)),
      change20dVal: Number((c - p20).toFixed(2)),
      change20dPct: p20 > 0 ? Number((((c - p20) / p20) * 100).toFixed(2)) : 0,
      priceYearStart: Number(pytd.toFixed(2)),
      changeYtdVal: Number((c - pytd).toFixed(2)),
      changeYtdPct: pytd > 0 ? Number((((c - pytd) / pytd) * 100).toFixed(2)) : 0,
    };
  };

  const stocksAvg = calculate30AvgMetrics();

  const renderMetricBadge = (val: number, pct: number) => {
    const isPos = pct > 0;
    const isNeg = pct < 0;
    const color = isPos ? '#f87171' : isNeg ? '#34d399' : '#94a3b8';
    const valSign = isPos ? '+' : '';
    const pctSign = isPos ? '+' : '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color }} className="price-num">
          {pctSign}{pct.toFixed(2)}%
        </span>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color, opacity: 0.85 }} className="price-num">
          ({valSign}{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
        </span>
      </div>
    );
  };

  const renderTileCard = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    metrics: MarketIndexMetrics | null,
    accentColor: string
  ) => {
    return (
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: `1px solid ${accentColor}33`,
          boxShadow: `0 4px 20px ${accentColor}15`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: '280px',
          flex: 1
        }}
      >
        {/* カードヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: `${accentColor}20`,
                color: accentColor,
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', margin: 0 }}>{title}</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{subtitle}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>現在値</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }} className="price-num">
              {metrics ? metrics.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '取得中...'}
            </div>
          </div>
        </div>

        {/* 比較指標グリッド */}
        {metrics ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>前日比</span>
              {renderMetricBadge(metrics.changePrevVal, metrics.changePrevPct)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>5日比</span>
              {renderMetricBadge(metrics.change5dVal, metrics.change5dPct)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>20日比</span>
              {renderMetricBadge(metrics.change20dVal, metrics.change20dPct)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>年始比</span>
              {renderMetricBadge(metrics.changeYtdVal, metrics.changeYtdPct)}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingTop: '12px', textAlign: 'center' }}>
            市場データを同期中...
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}
    >
      {renderTileCard('日経平均', '^N225', <TrendingUp size={18} />, nikkei, '#38bdf8')}
      {renderTileCard('TOPIX', topix ? topix.symbol : 'TOPIX', <BarChart2 size={18} />, topix, '#a78bfa')}
      {renderTileCard('30銘柄平均', stocksAvg ? stocksAvg.symbol : 'ポートフォリオ平均', <Activity size={18} />, stocksAvg, '#f43f5e')}
    </div>
  );
};
