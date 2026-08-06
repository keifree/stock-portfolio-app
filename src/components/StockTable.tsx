import React, { useState } from 'react';
import { StockItem } from '../types';
import { getAutoTseJapaneseInfo, calculateDynamicMarketCap, getHistoricalPriceOnDate } from '../services/tseMaster';
import { formatMarketCap, saveStocks } from '../services/storage';
import { fetchJpStockDatePrice } from '../services/yahooFinance';
import {
  ArrowUpDown,
  Trash2,
  FileText,
  Calendar,
  Check,
  X
} from 'lucide-react';

interface StockTableProps {
  stocks: StockItem[];
  tabs: TabConfig[];
  isReadOnly?: boolean;
  onSelectStock: (stock: StockItem) => void;
  onDeleteStock: (stockId: string) => void;
  onUpdateStock: (stock: StockItem) => void; // 銘柄更新用コールバックを追加
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

/**
 * ユーザー入力の年月日テキスト（例: 25/01/04, 25-01-04, 250104等）を標準日付（YYYY-MM-DD）に自動解釈するパーサー
 */
function parseYYMMDDToDateStr(input: string): string | null {
  if (!input) return null;
  const clean = input.replace(/[\/\-\s]/g, '').trim();

  // 1. YYMMDD (6桁の連続した数字) の場合
  if (/^\d{6}$/.test(clean)) {
    const yy = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const dd = clean.substring(4, 6);
    return `20${yy}-${mm}-${dd}`;
  }

  // 2. スラッシュやハイフン区切りの場合 (YY/MM/DD や YYYY/MM/DD)
  const parts = input.split(/[\/\-]/);
  if (parts.length === 3) {
    let yy = parts[0].trim();
    let mm = parts[1].trim().padStart(2, '0');
    let dd = parts[2].trim().padStart(2, '0');

    if (yy.length === 2) {
      yy = `20${yy}`;
    }
    return `${yy}-${mm}-${dd}`;
  }

  // 3. すでに標準形式 YYYY-MM-DD の場合
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  return null;
}

/**
 * 西暦4桁(YYYY-MM-DD)を表示用の西暦下2桁(YY/MM/DD)に変換するフォーマッター
 */
const formatYYMMDD = (dateStr: string) => {
  if (!dateStr) return '24/08/01';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const yy = parts[0].substring(2);
    return `${yy}/${parts[1]}/${parts[2]}`;
  }
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return '24/08/01';
};

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  tabs,
  isReadOnly = false,
  onSelectStock,
  onDeleteStock,
  onUpdateStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [localStocks, setLocalStocks] = useState<StockItem[]>(stocks);

  // 採用日個別編集用
  const [editingAdoptId, setEditingAdoptId] = useState<string | null>(null);
  const [editingAdoptDate, setEditingAdoptDate] = useState<string>('');

  React.useEffect(() => {
    setLocalStocks(stocks);
  }, [stocks]);

  const filteredStocks = localStocks.filter((stock) => {
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

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'code') {
      const codeA = parseInt(a.code, 10) || 0;
      const codeB = parseInt(b.code, 10) || 0;
      return sortAsc ? codeA - codeB : codeB - codeA;
    }

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
      setSortAsc(field === 'code' ? true : false);
    }
  };

  const renderChangeText = (pct: number, price: number) => {
    if (!price || price <= 0) {
      return <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.88rem' }}>-</span>;
    }
    const isPos = pct > 0;
    const isNeg = pct < 0;
    const color = isPos ? '#f87171' : isNeg ? '#34d399' : 'var(--text-muted)';

    return (
      <span style={{ color, fontWeight: 800, fontSize: '0.88rem' }} className="price-num">
        {isPos ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
      </span>
    );
  };

  const handleConfirmAdoptDate = async (stock: StockItem) => {
    const parsedDate = parseYYMMDDToDateStr(editingAdoptDate);
    if (!parsedDate) {
      alert("日付の形式が正しくありません。\n入力例：\n・25/01/04 (年下2桁/月/日)\n・25-01-04\n・250104 (6桁連続)");
      return;
    }

    let newAdoptPrice = stock.currentPrice;
    try {
      const price = await fetchJpStockDatePrice(stock.code, parsedDate);
      if (price !== null) {
        newAdoptPrice = price;
      } else {
        newAdoptPrice = getHistoricalPriceOnDate(stock.code, stock.currentPrice, parsedDate);
      }
    } catch (e) {
      newAdoptPrice = getHistoricalPriceOnDate(stock.code, stock.currentPrice, parsedDate);
    }

    const changeAdoptPct = newAdoptPrice > 0 ? Number((((stock.currentPrice - newAdoptPrice) / newAdoptPrice) * 100).toFixed(2)) : 0;

    const updated = localStocks.map((s) => {
      if (s.id === stock.id) {
        return {
          ...s,
          adoptDate: parsedDate,
          adoptPrice: newAdoptPrice,
          changeAdoptPct
        };
      }
      return s;
    });

    setLocalStocks(updated);
    saveStocks(updated);
    setEditingAdoptId(null);
  };

  /**
   * 銘柄を別のタブに移動し、日時・移動元・移動先をIRメモ履歴に自動で記録する関数
   */
  const handleMoveTab = (stock: StockItem, targetTabId: string) => {
    if (isReadOnly) return;

    // タブ名を取得
    const sourceTabName = tabs.find(t => t.id === stock.tabId)?.name || '不明';
    const targetTabName = tabs.find(t => t.id === targetTabId)?.name || '不明';

    // 削除ボタンと同様に確認画面を挟む
    if (!window.confirm(`銘柄「${stock.name} (${stock.code})」を「${sourceTabName}」から「${targetTabName}」へ移動しますか？`)) {
      return;
    }

    const today = new Date();
    const yy = String(today.getFullYear()).substring(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStrYYMMDD = `${yy}/${mm}/${dd}`;
    const dateStrFull = `${today.getFullYear()}-${mm}-${dd}`;

    let logContent = `${dateStrYYMMDD} に「${sourceTabName}」から「${targetTabName}」へ移動しました。`;
    let nextAdoptPrice = stock.adoptPrice;
    let nextAdoptDate = stock.adoptDate;

    // 30銘柄から離脱（外した）した場合：その日の終値とパフォーマンス(%)を自動記録
    if (stock.tabId === 'tab-30' && targetTabId !== 'tab-30') {
      const exitPrice = stock.currentPrice;
      const startPrice = stock.adoptPrice > 0 ? stock.adoptPrice : stock.currentPrice;
      const perfPct = startPrice > 0 ? Number((((exitPrice - startPrice) / startPrice) * 100).toFixed(2)) : 0;
      const perfStr = perfPct > 0 ? `+${perfPct}%` : `${perfPct}%`;
      
      logContent = `${dateStrYYMMDD} に「${sourceTabName}」から「${targetTabName}」へ移動（除外）しました。離脱終値: ¥${exitPrice.toLocaleString()} (採用時価格: ¥${startPrice.toLocaleString()} パフォーマンス: ${perfStr})`;
    }
    // 30銘柄へ採用（追加）した場合：その日の現在値を採用価格・採用日として自動ログ記録
    else if (targetTabId === 'tab-30') {
      nextAdoptPrice = stock.currentPrice;
      nextAdoptDate = dateStrFull;
      logContent = `${dateStrYYMMDD} に「${sourceTabName}」から「${targetTabName}」へ移動（採用）しました。採用時終値: ¥${stock.currentPrice.toLocaleString()}`;
    }

    // 歴史（IRコメント）に自動で移動ログを追記
    const moveLog = {
      id: `movelog-${stock.code}-${Date.now()}`,
      date: dateStrFull,
      title: 'タブ移動履歴',
      category: 'イベント記録',
      content: logContent,
      author: 'システム自動記録',
      tags: ['移動履歴'],
      createdAt: new Date().toISOString()
    };

    const updatedStock: StockItem = {
      ...stock,
      tabId: targetTabId,
      adoptPrice: nextAdoptPrice,
      adoptDate: nextAdoptDate,
      changeAdoptPct: nextAdoptPrice > 0 ? Number((((stock.currentPrice - nextAdoptPrice) / nextAdoptPrice) * 100).toFixed(2)) : 0,
      irComments: [moveLog, ...(stock.irComments || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateStock(updatedStock);
    alert(`銘柄 [${stock.code}] を「${targetTabName}」に移動し、履歴に記録しました！`);
  };

  return (
    <div className="glass-card table-glass-wrapper">
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
          並び順: <strong style={{ color: 'var(--accent-cyan)' }}>{sortField === 'code' ? 'コード順' : sortField} ({sortAsc ? '昇順 ▲' : '降順 ▼'})</strong> | 表示: <strong>{sortedStocks.length}</strong> 件
        </div>
      </div>

      <div className="table-responsive">
        <table className="stock-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  コード・銘柄 {sortField === 'code' && (sortAsc ? '▲' : '▼')}
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
                  採用比
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('marketCap')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  時価総額
                  <ArrowUpDown size={12} />
                </div>
              </th>
              {!isReadOnly && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map((stock) => {
              const autoTse = getAutoTseJapaneseInfo(stock.code, stock.name);
              const displayStockName = autoTse.name;
              const displaySector = autoTse.sector || stock.sector;

              return (
                <tr
                  key={stock.id}
                  onClick={() => onSelectStock(stock)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent-cyan)' }} className="price-num">
                        {stock.code}
                      </span>
                      <span 
                        style={{ 
                          fontSize: '0.78rem', 
                          fontWeight: 700, 
                          color: '#fff',
                          display: 'inline-block',
                          maxWidth: '110px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={displayStockName}
                      >
                        {displayStockName}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.85 }}>
                        {displaySector}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem' }} className="price-num">
                      ¥{stock.currentPrice.toLocaleString()}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      {renderChangeText(stock.changePrevPct, stock.previousPrice)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} className="price-num">
                        {stock.previousPrice > 0 ? `¥${stock.previousPrice.toLocaleString()}` : '-'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      {renderChangeText(stock.change5dPct, stock.price5DaysAgo)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} className="price-num">
                        {stock.price5DaysAgo > 0 ? `¥${stock.price5DaysAgo.toLocaleString()}` : '-'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      {renderChangeText(stock.change20dPct, stock.price20DaysAgo)}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="price-num">
                        {stock.price20DaysAgo > 0 ? `¥${stock.price20DaysAgo.toLocaleString()}` : '-'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      {renderChangeText(stock.changeYtdPct, stock.priceYearStart)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} className="price-num">
                        {stock.priceYearStart > 0 ? `¥${stock.priceYearStart.toLocaleString()}` : '-'}
                      </span>
                    </div>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      {renderChangeText(stock.changeAdoptPct, stock.adoptPrice)}
                      {editingAdoptId === stock.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          <input
                            type="text"
                            value={editingAdoptDate}
                            onChange={(e) => setEditingAdoptDate(e.target.value)}
                            placeholder="25/01/04"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmAdoptDate(stock); // Enterキーで自動確定
                              } else if (e.key === 'Escape') {
                                setEditingAdoptId(null); // Escキーで自動キャンセル
                              }
                            }}
                            style={{ fontSize: '0.68rem', padding: '1px 2px', background: '#0f172a', color: '#fff', border: '1px solid var(--accent-cyan)', width: '70px' }}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => handleConfirmAdoptDate(stock)}
                            style={{ padding: '1px 4px', fontSize: '0.68rem', background: '#10b981', borderColor: '#10b981' }}
                            title="変更を確定"
                          >
                            <Check size={10} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setEditingAdoptId(null)}
                            style={{ padding: '1px 4px', fontSize: '0.68rem' }}
                            title="キャンセル"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            if (isReadOnly) return;
                            setEditingAdoptId(stock.id);
                            setEditingAdoptDate(formatYYMMDD(stock.adoptDate));
                          }}
                          style={{ fontSize: '0.68rem', color: 'var(--text-muted)', cursor: isReadOnly ? 'default' : 'pointer', textDecoration: isReadOnly ? 'none' : 'underline' }}
                          title="クリックして採用日を変更 (確定ボタン付き)"
                        >
                          {formatYYMMDD(stock.adoptDate)} {stock.adoptPrice > 0 ? `¥${stock.adoptPrice.toLocaleString()}` : '¥-'} <Calendar size={10} style={{ display: 'inline' }} />
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }} className="price-num">
                      {formatMarketCap(stock.marketCap)}
                    </span>
                  </td>

                  {!isReadOnly && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* 該当銘柄以外の別タブへの移動ボタン群を動的配置 */}
                        {tabs.filter(t => t.id !== stock.tabId).map(t => {
                          const badgeColor = t.id === 'tab-30' ? '#38bdf8' : t.id === 'tab-a' ? '#a78bfa' : '#34d399';
                          const buttonLabel = t.name.replace('銘柄', ''); // 'A銘柄' -> 'A'
                          return (
                            <button
                              key={t.id}
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleMoveTab(stock, t.id)}
                              style={{ 
                                padding: '2px 5px', 
                                fontSize: '0.68rem', 
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                                color: badgeColor,
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}
                              title={`${t.name}へ移動して履歴を自動保存`}
                            >
                              {buttonLabel}へ
                            </button>
                          );
                        })}

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            if (confirm(`銘柄「${displayStockName}」を削除しますか？`)) {
                              onDeleteStock(stock.id);
                            }
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', marginLeft: '4px' }}
                          title="この銘柄をポートフォリオから削除します"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
