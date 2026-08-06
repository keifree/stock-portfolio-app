import React, { useState } from 'react';
import { FinancialQuarterNote } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Save } from 'lucide-react';

interface FinancialNotesProps {
  notes: FinancialQuarterNote[];
  onUpdateNotes: (notes: FinancialQuarterNote[]) => void;
}

export const FinancialNotes: React.FC<FinancialNotesProps> = ({
  notes,
  onUpdateNotes
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [period, setPeriod] = useState('2025年3月期 2Q');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [revenue, setRevenue] = useState('');
  const [operatingProfit, setOperatingProfit] = useState('');
  const [netProfit, setNetProfit] = useState('');
  const [progressRate, setProgressRate] = useState('');
  const [impression, setImpression] = useState<'positive' | 'neutral' | 'negative'>('positive');
  const [summaryNote, setSummaryNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!period || !summaryNote) return;

    const newNote: FinancialQuarterNote = {
      id: `fin-${Date.now()}`,
      period,
      releaseDate,
      revenue: revenue ? parseFloat(revenue) : undefined,
      operatingProfit: operatingProfit ? parseFloat(operatingProfit) : undefined,
      netProfit: netProfit ? parseFloat(netProfit) : undefined,
      progressRate: progressRate ? parseFloat(progressRate) : undefined,
      impression,
      summaryNote,
      updatedAt: new Date().toISOString()
    };

    onUpdateNotes([newNote, ...notes]);
    setSummaryNote('');
    setRevenue('');
    setOperatingProfit('');
    setNetProfit('');
    setProgressRate('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('この決算記録を削除しますか？')) {
      onUpdateNotes(notes.filter((n) => n.id !== id));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>各期決算実績・評価メモ ({notes.length}件)</h3>
        {!isAdding && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
            <Plus size={15} />
            <span>新規決算メモを記録</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.95)' }}>
          <div style={{ fontWeight: 700, marginBottom: '14px', color: 'var(--accent-cyan)' }}>＋ 決算情報・手記の追加</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>対象決算期</label>
              <input type="text" className="input-field" placeholder="例: 2025年3月期 2Q" value={period} onChange={(e) => setPeriod(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>発表日</label>
              <input type="date" className="input-field" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>決算評価</label>
              <select className="input-field" style={{ width: '100%' }} value={impression} onChange={(e) => setImpression(e.target.value as any)}>
                <option value="positive">🟢 ポジティブ (計画超過・上振れ)</option>
                <option value="neutral">🟡 インライン (想定通り)</option>
                <option value="negative">🔴 ネガティブ (下振れ・進捗遅延)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>売上高 (百万円)</label>
              <input type="number" className="input-field" placeholder="12500" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>営業利益 (百万円)</label>
              <input type="number" className="input-field" placeholder="1800" value={operatingProfit} onChange={(e) => setOperatingProfit(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>純利益 (百万円)</label>
              <input type="number" className="input-field" placeholder="1200" value={netProfit} onChange={(e) => setNetProfit(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>通期進捗率 (%)</label>
              <input type="number" step="0.1" className="input-field" placeholder="52.4" value={progressRate} onChange={(e) => setProgressRate(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>決算内容・IR分析メモ *</label>
            <textarea className="input-field" rows={3} placeholder="進捗率、セグメント別動向、会社計画修正の有無などを記述..." value={summaryNote} onChange={(e) => setSummaryNote(e.target.value)} required style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAdding(false)}>キャンセル</button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Save size={14} />
              <span>保存する</span>
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notes.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            まだ決算メモが記録されていません。上のボタンから各期決算情報を追加してください。
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{n.period}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>発表日: {n.releaseDate}</span>
                  {n.impression === 'positive' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--stock-up)', fontWeight: 600 }}>
                      <TrendingUp size={12} /> ポジティブ
                    </span>
                  )}
                  {n.impression === 'neutral' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <Minus size={12} /> インライン
                    </span>
                  )}
                  {n.impression === 'negative' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--stock-down)', fontWeight: 600 }}>
                      <TrendingDown size={12} /> ネガティブ
                    </span>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" style={{ padding: '3px 6px', color: 'var(--stock-down)' }} onClick={() => handleDelete(n.id)} title="削除">
                  <Trash2 size={13} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '0.82rem' }}>
                <div>売上高: <span style={{ fontWeight: 700, color: '#fff' }} className="price-num">{n.revenue ? `¥${n.revenue.toLocaleString()}M` : '-'}</span></div>
                <div>営業益: <span style={{ fontWeight: 700, color: '#fff' }} className="price-num">{n.operatingProfit ? `¥${n.operatingProfit.toLocaleString()}M` : '-'}</span></div>
                <div>純利益: <span style={{ fontWeight: 700, color: '#fff' }} className="price-num">{n.netProfit ? `¥${n.netProfit.toLocaleString()}M` : '-'}</span></div>
                <div>通期進捗率: <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} className="price-num">{n.progressRate ? `${n.progressRate}%` : '-'}</span></div>
              </div>

              <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{n.summaryNote}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
