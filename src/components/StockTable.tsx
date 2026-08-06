import React, { useState } from 'react';
import { StockItem } from '../types';
import { getAutoTseJapaneseInfo } from '../services/tseMaster';
import { formatMarketCap, saveStocks } from '../services/storage';
import {
  ArrowUpDown,
  Trash2,
  FileText,
  Calendar
} from 'lucide-react';

interface StockTableProps {
  stocks: StockItem[];
  isReadOnly?: boolean;
  onSelectStock: (stock: StockItem) => void;
  onDeleteStock: (stockId: string) => void;
}

type SortField = 
  | 'code'
  | 'name'
  | 'currentPrice'
  | 'changePrevPct'
  | 'change5dPct'
  | 'change20dPct'
  | 'changeYtdPct'
  | 'changeAdoptPct'
  | 'marketCap';

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  isReadOnly = false,
  onSelectStock,
  onDeleteStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('changePrevPct');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [editingAdoptId, setEditingAdoptId] = useState<string | null>(null);
  const [editingAdoptDate, setEditingAdoptDate] = useState<string>('');

  // フィルタリング
  const filteredStocks = stocks.filter((stock) => {
    const autoTse = getAutoTseJapaneseInfo(stock.code, stock.name);
    const displayStockName = autoTse.name;
    const displaySector = autoTse.sector || stock.sector;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      stock.code.toLowerCase().includes(term) ||
      displayStockName.toLowerCase().includes(term) ||
      displaySector.toLowerCase().includes(term)
    );
  });

  // ソート
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string') {
      valA = (valA as string).toLowerCase();
      valB = (valB as string).toLowerCase();
    }

    if (valA! < valB!) return sortAsc ? -1 : 1;
    if (valA! > valB!) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // 背景枠なし・比(%)の数字テキストのみを赤(プラス)・緑(マイナス)で色付け
  const renderChangeText = (pct: number) => {
    const isPos = pct > 0;
    const isNeg = pct < 0;
    const color = isPos ? '#f87171' : isNeg ? '#34d399' : 'var(--text-muted)';

    return (
      <span style={{ color, fontWeight: 800, fontSize: '0.88rem' }} className="price-num">
        {isPos ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
      </span>
    );
  };

  // 日付文字列を MM/DD 形式へ短縮
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  // 採用日のその場ワンクリック変更機能
  const handleSaveAdoptDate = (stock: StockItem, newDate: string) => {
    if (!newDate) return;
    const updatedStocks = stocks.map((s) => {
      if (s.id === stock.id) {
        // 株価履歴があればその日の価格を補正採用価格とする
        let newAdoptPrice = s.adoptPrice;
        if (s.chartHistory && s.chartHistory.length > 0) {
          const pt = s.chartHistory.find((p) => p.date === newDate) || s.chartHistory.slice().reverse().find((p) => p.date <= newDate);
          if (pt) newAdoptPrice = pt.price;
        }
        const changeAdoptPct = newAdoptPrice > 0 ? Number((((s.currentPrice - newAdoptPrice) / newAdoptPrice) * 100).toFixed(2)) : 0;
        return {
          ...s,
          adoptDate: newDate,
          adoptPrice: newAdoptPrice,
          changeAdoptPct
        };
      }
      return s;
    });
    saveStocks(updatedStocks);
    setEditingAdoptId(null);
    window.location.reload();
  };

  return (
    <div className="glass-card table-glass-wrapper">
      {/* ツールバー */}
      <div className="table-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '380px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>銘柄絞り込み:</span>
          <input
            type="text"
            className="input-field"
            placeholder="コード・銘柄名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          表示: <strong style={{ color: 'var(--accent-cyan)' }}>{sortedStocks.length}</strong> 件
        </div>
      </div>

      {/* 【画面固定スクロールエリア】テーブル内横スクロール */}
      <div className="table-responsive">
        <table className="stock-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  コード・銘柄
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('currentPrice')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  現在値
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('changePrevPct')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  前日比
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('change5dPct')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  5日比
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('change20dPct')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  20日比
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('changeYtdPct')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  年始比
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('changeAdoptPct')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  採用比 (日付変更可)
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('marketCap')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  時価総額
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>メモ</th>
              <th style={{ textAlign: 'center' }}>削除</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  該当する銘柄が見つかりませんでした。
                </td>
              </tr>
            ) : (
              sortedStocks.map((stock) => {
                const autoTse = getAutoTseJapaneseInfo(stock.code, stock.name);
                const displayStockName = autoTse.name;
                const displaySector = autoTse.sector || stock.sector;

                return (
                  <tr
                    key={stock.id}
                    className="table-row-hover"
                    onClick={() => onSelectStock(stock)}
                    style={{ cursor: 'pointer' }}
                    title="クリックして詳細・決算IR分析を開く"
                  >
                    {/* 1 & 2. コード・銘柄名・セクター */}
                    <td style={{ maxWidth: '145px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{stock.code}</span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={displayStockName}
                          >
                            {displayStockName}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.85 }}>
                          {displaySector}
                        </span>
                      </div>
                    </td>

                    {/* 3. 現在値 */}
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem' }} className="price-num">
                        ¥{stock.currentPrice.toLocaleString()}
                      </span>
                    </td>

                    {/* 4 & 5. 前日比 */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        {renderChangeText(stock.changePrevPct)}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} className="price-num">
                          ¥{stock.previousPrice.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* 6 & 7. 5日比 */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        {renderChangeText(stock.change5dPct)}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} className="price-num">
                          ¥{stock.price5DaysAgo.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* 8 & 9. 20日比 */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        {renderChangeText(stock.change20dPct)}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="price-num">
                          ¥{stock.price20DaysAgo.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* 10 & 11. 年始比 */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        {renderChangeText(stock.changeYtdPct)}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} className="price-num">
                          ¥{stock.priceYearStart.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* 12, 13 & 14. 採用比 （日付クリックでその場カレンダー変更対応） */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        {renderChangeText(stock.changeAdoptPct)}
                        {editingAdoptId === stock.id ? (
                          <input
                            type="date"
                            value={editingAdoptDate}
                            onChange={(e) => setEditingAdoptDate(e.target.value)}
                            onBlur={() => handleSaveAdoptDate(stock, editingAdoptDate)}
                            autoFocus
                            style={{ fontSize: '0.68rem', padding: '1px 2px', background: '#0f172a', color: '#fff', border: '1px solid var(--accent-cyan)' }}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (isReadOnly) return;
                              setEditingAdoptId(stock.id);
                              setEditingAdoptDate(stock.adoptDate || new Date().toISOString().split('T')[0]);
                            }}
                            style={{ fontSize: '0.68rem', color: 'var(--text-muted)', cursor: isReadOnly ? 'default' : 'pointer', textDecoration: isReadOnly ? 'none' : 'underline' }}
                            title="クリックして採用日を変更補正"
                          >
                            {formatShortDate(stock.adoptDate)} ¥{stock.adoptPrice.toLocaleString()} <Calendar size={10} style={{ display: 'inline' }} />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 15 & 16. 時価総額 */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className={`scale-badge ${stock.scale}`}>{stock.scale}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }} className="price-num">
                          {formatMarketCap(stock.marketCap)}
                        </span>
                      </div>
                    </td>

                    {/* 決算・IRメモ件数 */}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        <FileText size={12} />
                        <span>{stock.financialNotes.length + stock.irComments.length}</span>
                      </span>
                    </td>

                    {/* 操作列: 削除のみ */}
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {isReadOnly ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                      ) : (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`銘柄 「${displayStockName} (${stock.code})」 をポートフォリオから削除しますか？`)) {
                              onDeleteStock(stock.id);
                            }
                          }}
                          title="銘柄を削除"
                          style={{ padding: '3px 8px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
