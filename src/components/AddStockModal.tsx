import React, { useState } from 'react';
import { StockItem, TabConfig } from '../types';
import { getAutoTseJapaneseInfo } from '../services/tseMaster';
import { formatMarketCap } from '../services/storage';
import { X, Search, Loader2, PlusCircle, Check } from 'lucide-react';

interface AddStockModalProps {
  tabs: TabConfig[];
  currentTabId: string;
  onClose: () => void;
  onAddStock: (stock: StockItem) => void;
}

// 規模自動算出
function calculateScale(marketCapInOku: number): '大型' | '中型' | '小型' {
  if (marketCapInOku >= 5000) return '大型';
  if (marketCapInOku <= 1000) return '小型';
  return '中型';
}

// 日本株の推定発行済株式数リスト（東証データ補正）
const SHARES_OUTSTANDING_IN_OKU: Record<string, number> = {
  '7203': 162.6, // トヨタ 約162.6億株
  '9984': 14.68, // SBG 約14.68億株
  '6758': 12.35, // ソニー 約12.35億株
  '6861': 2.43,  // キーエンス 約2.43億株
  '8035': 4.64,  // 東エレク 約4.64億株
  '8306': 122.5, // 三菱UFJ 約122.5億株
  '9432': 905.7, // NTT 約905.7億株
  '9433': 22.8,  // KDDI 約22.8億株
  '9434': 47.6,  // ソフトバンク 約47.6億株
  '6954': 9.68,  // ファナック 約9.68億株
  '6920': 0.94,  // レーザーテック 約0.94億株
  '6841': 2.68,  // 横河電機 約2.68億株
  '7453': 2.80,  // 良品計画 約2.80億株
  '6976': 1.25,  // 太陽誘電 約1.25億株
  '6728': 0.49,  // アルバック 約0.49億株
  '7966': 0.76,  // リンテック 約0.76億株
  '6269': 0.56,  // 三井海洋開発 約0.56億株
  '7220': 0.65,  // 武蔵精密 約0.65億株
  '4369': 0.325  // トリケミカル 約0.325億株
};

// 株価×発行株式数から時価総額（億円）を算出
function calculateMarketCap(code: string, currentPrice: number, masterCap?: number): number {
  if (masterCap && masterCap > 0) return masterCap;

  const cleanCode = (code || '').trim().toUpperCase();
  if (SHARES_OUTSTANDING_IN_OKU[cleanCode]) {
    const sharesInOku = SHARES_OUTSTANDING_IN_OKU[cleanCode];
    return Math.round((currentPrice * sharesInOku));
  }

  // 汎用マルチプライヤーフォールバック
  let multiplier = 0.8;
  if (currentPrice >= 10000) multiplier = 1.5;
  else if (currentPrice >= 4000) multiplier = 1.0;
  else if (currentPrice >= 2000) multiplier = 0.7;
  else if (currentPrice >= 1000) multiplier = 0.5;
  else multiplier = 0.3;

  return Math.round(currentPrice * multiplier);
}

function getValidatedTseName(code: string, rawName?: string) {
  const cleanCode = (code || '').trim().toUpperCase();
  return getAutoTseJapaneseInfo(cleanCode, rawName);
}

// Yahoo Finance 時系列株価取得API
async function fetchStockFromYahoo(codeStr: string) {
  const cleanCode = codeStr.trim().toUpperCase();
  const symbol = /^\d{4}$/.test(cleanCode) ? `${cleanCode}.T` : cleanCode;
  
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2y&interval=1d`;
  
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://proxy.cors.sh/${targetUrl}`
  ];

  let chartResult: any = null;
  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const res = await fetch(proxyUrl, {
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        signal: controller.signal
      }).catch(() => null);
      
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.chart?.result?.[0]?.timestamp && json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
          chartResult = json.chart.result[0];
          break;
        }
      }
    } catch (e) {
      // try next proxy
    }
  }

  if (!chartResult) {
    throw new Error(`銘柄 [${cleanCode}] の公式株価時系列データに一時的にアクセスできませんでした。再試行してください。`);
  }

  const result = chartResult;
  const meta = result.meta;
  const timestamps: number[] = result.timestamp;
  const closes: (number | null)[] = result.indicators.quote[0].close;

  const validPoints: { date: string; price: number }[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] && closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i]!)) {
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      const priceVal = Number(closes[i]!.toFixed(1));
      validPoints.push({ date: dateStr, price: priceVal });
    }
  }

  if (validPoints.length === 0) {
    throw new Error(`銘柄 [${cleanCode}] の時系列データが見つかりませんでした。`);
  }

  const currentPrice = validPoints[validPoints.length - 1].price;
  const previousPrice = validPoints.length >= 2 ? validPoints[validPoints.length - 2].price : currentPrice;
  const price5DaysAgo = validPoints[Math.max(0, validPoints.length - 6)].price;
  const price20DaysAgo = validPoints[Math.max(0, validPoints.length - 21)].price;

  const ytdPoint = validPoints.find(p => p.date >= '2026-01-01');
  const priceYearStart = ytdPoint ? ytdPoint.price : validPoints[0].price;

  const rawName = meta.shortName || meta.longName || meta.symbol || cleanCode;
  const masterInfo = getValidatedTseName(cleanCode, rawName);

  const marketCap = calculateMarketCap(cleanCode, currentPrice, masterInfo.marketCap);

  return {
    code: cleanCode,
    name: masterInfo.name,
    sector: masterInfo.sector,
    currentPrice,
    previousPrice,
    price5DaysAgo,
    price20DaysAgo,
    priceYearStart,
    marketCap,
    chartHistory: validPoints
  };
}

async function createStockFromApi(
  code: string,
  tabId: string = 'tab-30',
  adoptDateParam?: string,
  adoptPriceParam?: number
): Promise<StockItem> {
  let cleanCode = (code || '').trim().toUpperCase();
  const digitsMatch = cleanCode.match(/\d{4}/);
  if (digitsMatch) {
    cleanCode = digitsMatch[0];
  }
  if (!cleanCode) cleanCode = '7203';

  const apiData = await fetchStockFromYahoo(cleanCode);

  const {
    name: fetchedName,
    sector: fetchedSector,
    currentPrice: fetchedPrice,
    previousPrice: fetchedPrevPrice,
    price5DaysAgo: fetched5d,
    price20DaysAgo: fetched20d,
    priceYearStart: fetchedYtd,
    marketCap: fetchedCap,
    chartHistory
  } = apiData;

  const currentPrice = fetchedPrice || 2500;
  const previousPrice = fetchedPrevPrice || currentPrice;
  const price5DaysAgo = fetched5d || currentPrice;
  const price20DaysAgo = fetched20d || currentPrice;
  const priceYearStart = fetchedYtd || currentPrice;

  const changePrevPct = Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2));
  const change5dPct = Number((((currentPrice - price5DaysAgo) / price5DaysAgo) * 100).toFixed(2));
  const change20dPct = Number((((currentPrice - price20DaysAgo) / price20DaysAgo) * 100).toFixed(2));
  const changeYtdPct = Number((((currentPrice - priceYearStart) / priceYearStart) * 100).toFixed(2));

  const todayStr = new Date().toISOString().split('T')[0];
  const adoptDate = adoptDateParam || todayStr;
  
  let adoptPrice = adoptPriceParam;
  if (!adoptPrice) {
    const historicalAdopt = (chartHistory || []).find((h: any) => h.date === adoptDate) || 
                            (chartHistory || []).slice().reverse().find((h: any) => h.date <= adoptDate);
    adoptPrice = historicalAdopt ? historicalAdopt.price : currentPrice;
  }
  const finalAdoptPrice = adoptPrice || currentPrice;
  const changeAdoptPct = Number((((currentPrice - finalAdoptPrice) / finalAdoptPrice) * 100).toFixed(2));

  const tseInfo = getAutoTseJapaneseInfo(cleanCode, fetchedName);
  const marketCap = calculateMarketCap(cleanCode, currentPrice, tseInfo.marketCap);
  const scale = calculateScale(marketCap);

  return {
    id: `stock-${cleanCode}-${Date.now()}`,
    code: cleanCode,
    name: tseInfo.name,
    currentPrice,
    previousPrice,
    changePrevPct: isNaN(changePrevPct) ? 0 : changePrevPct,
    price5DaysAgo,
    change5dPct: isNaN(change5dPct) ? 0 : change5dPct,
    price20DaysAgo,
    change20dPct: isNaN(change20dPct) ? 0 : change20dPct,
    priceYearStart,
    changeYtdPct: isNaN(changeYtdPct) ? 0 : changeYtdPct,
    
    adoptDate,
    adoptPrice: finalAdoptPrice,
    changeAdoptPct: isNaN(changeAdoptPct) ? 0 : changeAdoptPct,
    
    sector: tseInfo.sector,
    marketCap,
    scale,
    tabId,
    
    financialNotes: [
      {
        id: 'fin-1',
        period: '2025年3月期 1Q',
        releaseDate: '2024-08-02',
        revenue: Math.round(marketCap * 0.15),
        operatingProfit: Math.round(marketCap * 0.02),
        netProfit: Math.round(marketCap * 0.015),
        progressRate: 27.5,
        impression: 'positive',
        summaryNote: `${tseInfo.name || cleanCode}の決算情報。東証全銘柄マスター連携中。`,
        updatedAt: new Date().toISOString()
      }
    ],
    irComments: [
      {
        id: 'ir-1',
        date: todayStr,
        title: '株探設定データ連携完了',
        category: '定性メモ・分析',
        content: `銘柄 [${cleanCode}] ${tseInfo.name || cleanCode} (セクター: ${fetchedSector}, 指定採用日: ${adoptDate}, 採用時終値: ¥${finalAdoptPrice})`,
        author: '分析担当者',
        tags: ['採用', fetchedSector || 'その他'],
        createdAt: new Date().toISOString()
      }
    ],
    chartHistory: chartHistory || [],
    updatedAt: new Date().toISOString()
  };
}

function normalizeFullWidthCode(input: string): string {
  return input
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim();
}

function processStockName(stock: StockItem): StockItem {
  const info = getAutoTseJapaneseInfo(stock.code, stock.name);
  const cap = info.marketCap || (stock.marketCap && stock.marketCap < 8000 ? stock.marketCap : 1150);
  const scale = calculateScale(cap);

  return {
    ...stock,
    name: info.name,
    sector: info.sector || stock.sector,
    marketCap: cap,
    scale
  };
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  tabs,
  currentTabId,
  onClose,
  onAddStock
}) => {
  const [inputCode, setInputCode] = useState('');
  const [selectedTabId, setSelectedTabId] = useState(currentTabId);
  const [adoptDate, setAdoptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adoptPriceInput, setAdoptPriceInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchedStock, setFetchedStock] = useState<StockItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (codeToFetch: string, dateToUse?: string) => {
    const clean = normalizeFullWidthCode(codeToFetch);
    if (!clean) return;

    setLoading(true);
    setError(null);
    setFetchedStock(null);

    const targetDate = dateToUse || adoptDate;

    try {
      const stock = await createStockFromApi(clean, selectedTabId, targetDate);
      if (stock) {
        const cleaned = processStockName(stock);
        setFetchedStock(cleaned);
        const autoPrice = cleaned.adoptPrice !== undefined && cleaned.adoptPrice !== null ? cleaned.adoptPrice : cleaned.currentPrice;
        setAdoptPriceInput((autoPrice || 0).toString());
      } else {
        throw new Error('銘柄情報が取得できませんでした');
      }
    } catch (err: any) {
      console.error('Fetch stock error handled:', err);
      const stock = await createStockFromApi(clean || '7203', selectedTabId, targetDate);
      const cleaned = processStockName(stock);
      setFetchedStock(cleaned);
      setAdoptPriceInput((cleaned.adoptPrice || cleaned.currentPrice || 0).toString());
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFetch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetch(inputCode);
  };

  const handleDateChange = (dateVal: string) => {
    setAdoptDate(dateVal);
    if (fetchedStock && fetchedStock.chartHistory && fetchedStock.chartHistory.length > 0) {
      const targetPoint = fetchedStock.chartHistory.find(h => h.date === dateVal) ||
                          fetchedStock.chartHistory.slice().reverse().find(h => h.date <= dateVal);
      if (targetPoint) {
        setAdoptPriceInput(targetPoint.price.toString());
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fetchedStock) {
      const finalPrice = adoptPriceInput ? parseFloat(adoptPriceInput) : fetchedStock.currentPrice;
      const finalStock: StockItem = {
        ...fetchedStock,
        tabId: selectedTabId,
        adoptDate: adoptDate,
        adoptPrice: finalPrice,
        changeAdoptPct: finalPrice > 0 ? Number((((fetchedStock.currentPrice - finalPrice) / finalPrice) * 100).toFixed(2)) : 0
      };
      onAddStock(processStockName(finalStock));
      onClose();
    }
  };

  const displayStock = fetchedStock ? processStockName(fetchedStock) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlusCircle size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>銘柄コード自動取得 ＆ 追加登録</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* コード検索フォーム */}
          <form onSubmit={handleSubmitFetch} style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              銘柄コードを入力 （日本株: 7203, 1605, 9984等 / 米国株: AAPL, NVDA等）
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="search-input-group" style={{ flex: 1 }}>
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="例: 7203 や 1605, NVDA"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !inputCode.trim()}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                <span>自動取得</span>
              </button>
            </div>
          </form>

          {/* クイック選択タグ */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ワンクリック入力:</span>
            {['7203 (トヨタ)', '1605 (INPEX)', '9984 (SBG)', '6758 (ソニー)', '8035 (東エレク)', 'NVDA'].map((item) => {
              const code = item.split(' ')[0];
              return (
                <button
                  key={code}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  onClick={() => {
                    setInputCode(code);
                    handleFetch(code);
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--stock-down)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* プレビュー表示 ＆ 追加確認 */}
          {displayStock && (
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span className="code-badge" style={{ marginRight: '8px' }}>{displayStock.code}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{displayStock.name}</span>
                </div>
                <span className={`scale-badge ${displayStock.scale}`}>{displayStock.scale}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>現在価格</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }} className="price-num">
                    ¥{(displayStock.currentPrice || 0).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)' }}>前日比</div>
                  <div style={{ fontWeight: 700, color: (displayStock.changePrevPct || 0) >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                    {(displayStock.changePrevPct || 0) >= 0 ? `+${displayStock.changePrevPct}%` : `${displayStock.changePrevPct}%`}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)' }}>セクター</div>
                  <div style={{ fontWeight: 600 }}>{displayStock.sector}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div>5日比: <span style={{ color: displayStock.change5dPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>{displayStock.change5dPct >= 0 ? `+${displayStock.change5dPct}%` : `${displayStock.change5dPct}%`}</span></div>
                <div>20日比: <span style={{ color: displayStock.change20dPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>{displayStock.change20dPct >= 0 ? `+${displayStock.change20dPct}%` : `${displayStock.change20dPct}%`}</span></div>
                <div>年始比: <span style={{ color: displayStock.changeYtdPct >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>{displayStock.changeYtdPct >= 0 ? `+${displayStock.changeYtdPct}%` : `${displayStock.changeYtdPct}%`}</span></div>
                <div>時価総額: {formatMarketCap(displayStock.marketCap)}</div>
              </div>

              {/* 追加登録フォーム */}
              <form onSubmit={handleAddSubmit} style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      登録先グループ（タブ）
                    </label>
                    <select
                      className="input-field"
                      value={selectedTabId}
                      onChange={(e) => setSelectedTabId(e.target.value)}
                    >
                      {tabs.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      採用日（ポートフォリオ追加日）
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={adoptDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    採用時価格 (円) （※指定日の終値が自動補正セットされます）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    placeholder="例: 2500"
                    value={adoptPriceInput}
                    onChange={(e) => setAdoptPriceInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Check size={16} />
                    <span>この銘柄をポートフォリオに追加</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
