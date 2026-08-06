import React, { useState } from 'react';
import { FinancialQuarterNote } from '../types';
import { Plus, Trash2, Pin, Check, X, Save, MessageSquare } from 'lucide-react';

interface FinancialNotesProps {
  notes: FinancialQuarterNote[];
  onUpdateNotes: (notes: FinancialQuarterNote[]) => void;
  isReadOnly?: boolean;
}

export const FinancialNotes: React.FC<FinancialNotesProps> = ({
  notes,
  onUpdateNotes,
  isReadOnly = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [evaluation, setEvaluation] = useState<'ポジ' | 'ニュートラル' | 'ネガ'>('ポジ');
  const [comment, setComment] = useState('');
  const [pinned, setPinned] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // すべてオプショナルのため、何も書かずに送信されても保存する
    const newNote: FinancialQuarterNote = {
      id: `fin-${Date.now()}`,
      date,
      title: title.trim(),
      evaluation,
      comment: comment.trim(),
      pinned,
      updatedAt: new Date().toISOString()
    };

    onUpdateNotes([newNote, ...notes]);
    
    // 入力完了後にフォームをリセット
    setTitle('');
    setComment('');
    setPinned(false);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    if (confirm('この決算・IRコメントを削除しますか？')) {
      onUpdateNotes(notes.filter((n) => n.id !== id));
    }
  };

  const togglePin = (noteId: string) => {
    if (isReadOnly) return;
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return { ...n, pinned: !n.pinned };
      }
      return n;
    });
    onUpdateNotes(updated);
  };

  // 1. ピン留め優先 2. 日付の降順 でソート
  const sortedNotes = [...notes].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0;
    const pinB = b.pinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const dateA = a.date || a.releaseDate || '';
    const dateB = b.date || b.releaseDate || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>決算・IRコメント ({notes.length}件)</h3>
        {!isAdding && !isReadOnly && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
            <Plus size={15} />
            <span>新規決算コメントを追加</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-cyan)' }}>
          <div style={{ fontWeight: 700, marginBottom: '14px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={16} /> 決算・IRコメント追加
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>日付</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>決算・IR評価</label>
              <select className="input-field" style={{ width: '100%' }} value={evaluation} onChange={(e) => setEvaluation(e.target.value as any)}>
                <option value="ポジ">🟢 ポジティブ (計画超過・良好)</option>
                <option value="ニュートラル">🟡 ニュートラル (想定内・インライン)</option>
                <option value="ネガ">🔴 ネガティブ (進捗遅れ・懸念あり)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>タイトル (自由入力)</label>
            <input type="text" className="input-field" placeholder="例: 26年3月期 1Q決算" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>分析コメント (自由入力・大きな枠)</label>
            <textarea className="input-field" rows={5} placeholder="決算内容、業績予想の修正、進捗率、見通しなどを記述..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', color: '#fff' }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Pin size={12} style={{ color: '#facc15' }} /> 一番上に常に表示する (ピン留め)
              </span>
            </label>
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
        {sortedNotes.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            まだ決算・IRコメントが記録されていません。上のボタンから追加してください。
          </div>
        ) : (
          sortedNotes.map((n) => {
            const isPos = n.evaluation === 'ポジ' || n.impression === 'positive';
            const isNeg = n.evaluation === 'ネガ' || n.impression === 'negative';
            const evalText = n.evaluation || (n.impression === 'positive' ? 'ポジ' : n.impression === 'negative' ? 'ネガ' : 'ニュートラル');
            const evalColor = isPos ? 'var(--stock-up)' : isNeg ? 'var(--stock-down)' : 'var(--text-secondary)';
            
            // 下位互換用フォールバック
            const displayTitle = n.title || n.period || '無題の決算手記';
            const displayDate = n.date || n.releaseDate || '';
            const displayComment = n.comment || n.summaryNote || '';

            return (
              <div 
                key={n.id} 
                className="glass-card" 
                style={{ 
                  padding: '18px 20px', 
                  border: n.pinned ? '1px solid rgba(250, 204, 21, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: n.pinned ? 'rgba(250, 204, 21, 0.03)' : 'rgba(15, 23, 42, 0.6)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {n.pinned && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#facc15', background: 'rgba(250, 204, 21, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        <Pin size={10} /> ピン留め
                      </span>
                    )}
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff' }}>{displayTitle}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayDate}</span>
                    
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        background: isPos ? 'rgba(16, 185, 129, 0.15)' : isNeg ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)', 
                        color: evalColor, 
                        fontWeight: 600 
                      }}
                    >
                      {evalText === 'ポジ' ? '🟢 ポジ' : evalText === 'ネガ' ? '🔴 ネガ' : '🟡 ニュートラル'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isReadOnly && (
                      <>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '3px 6px', color: n.pinned ? '#facc15' : 'var(--text-muted)' }} 
                          onClick={() => togglePin(n.id)} 
                          title={n.pinned ? "ピン留め解除" : "最上部ピン留め"}
                        >
                          <Pin size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '3px 6px', color: 'var(--stock-down)' }} 
                          onClick={() => handleDelete(n.id)} 
                          title="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 過去実績がある場合は表示 */}
                {(n.revenue || n.operatingProfit || n.progressRate) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', background: 'rgba(0, 0, 0, 0.2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '10px', fontSize: '0.78rem' }}>
                    {n.revenue && <div>売上高: <span style={{ fontWeight: 700 }} className="price-num">¥{n.revenue.toLocaleString()}M</span></div>}
                    {n.operatingProfit && <div>営業益: <span style={{ fontWeight: 700 }} className="price-num">¥{n.operatingProfit.toLocaleString()}M</span></div>}
                    {n.progressRate && <div>進捗率: <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} className="price-num">{n.progressRate}%</span></div>}
                  </div>
                )}

                <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {displayComment}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
