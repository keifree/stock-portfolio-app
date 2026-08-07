import React, { useState, useRef } from 'react';
import { FinancialQuarterNote } from '../types';
import { parseAndImportHorizontalFinancialCSV } from '../services/storage';
import { Plus, Trash2, Pin, Check, X, Save, MessageSquare, Edit3, Upload, Calendar, Search, Filter } from 'lucide-react';

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
  const [evaluation, setEvaluation] = useState<'未選択' | 'ポジ' | 'ニュートラル' | 'ネガ'>('未選択');
  const [comment, setComment] = useState('');
  const [pinned, setPinned] = useState(false);

  // 年絞り込み・フリーワード検索ステート
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 編集モード用の状態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editEvaluation, setEditEvaluation] = useState<'未選択' | 'ポジ' | 'ニュートラル' | 'ネガ'>('未選択');
  const [editComment, setEditComment] = useState('');

  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    
    setTitle('');
    setComment('');
    setPinned(false);
    setIsAdding(false);
  };

  const startEdit = (n: FinancialQuarterNote) => {
    setEditingId(n.id);
    setEditDate(n.date || n.releaseDate || new Date().toISOString().split('T')[0]);
    setEditTitle(n.title || n.period || '');
    setEditEvaluation(n.evaluation || (n.impression === 'positive' ? 'ポジ' : n.impression === 'negative' ? 'ネガ' : '未選択'));
    setEditComment(n.comment || n.summaryNote || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const updated = notes.map((n) => {
      if (n.id === editingId) {
        return {
          ...n,
          date: editDate,
          title: editTitle.trim(),
          evaluation: editEvaluation,
          comment: editComment.trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });

    onUpdateNotes(updated);
    setEditingId(null);
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

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const res = parseAndImportHorizontalFinancialCSV(text);
      if (res.success && res.importedNotesCount > 0) {
        alert(`【取り込み完了】\n対象銘柄数: ${res.affectedStocksCount}件\n取り込み決算メモ数: ${res.importedNotesCount}件\n\nスプレッドシートからの過去メモ一括取り込みが完了しました！`);
        window.location.reload();
      } else {
        alert('過去メモCSVの取り込みに失敗したか、対象の銘柄コードが見つかりませんでした。');
      }
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 年の選択肢リストを動的抽出
  const availableYears = Array.from(
    new Set(
      notes
        .map((n) => {
          const d = n.date || n.releaseDate || '';
          const match = d.match(/^(\d{4})/);
          return match ? match[1] : null;
        })
        .filter((y): y is string => y !== null)
    )
  ).sort((a, b) => b.localeCompare(a));

  // フィルタリング処理
  const filteredNotes = notes.filter((n) => {
    const d = n.date || n.releaseDate || '';
    if (selectedYear !== 'ALL' && !d.startsWith(selectedYear)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const t = (n.title || n.period || '').toLowerCase();
      const c = (n.comment || n.summaryNote || '').toLowerCase();
      const evalText = (n.evaluation || '').toLowerCase();
      if (!t.includes(q) && !c.includes(q) && !evalText.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0;
    const pinB = b.pinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const dateA = a.date || a.releaseDate || '';
    const dateB = b.date || b.releaseDate || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <div>
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv, .txt"
        onChange={handleCsvImport}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>決算・IRコメント ({notes.length}件)</h3>
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => csvInputRef.current?.click()} title="旧スプレッドシート過去メモ一括取り込み">
              <Upload size={14} />
              <span>旧スプレッドシートCSV一括読込</span>
            </button>
            {!isAdding && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
                <Plus size={15} />
                <span>新規決算コメントを追加</span>
              </button>
            )}
          </div>
        )}
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
          background: 'rgba(15, 23, 42, 0.6)',
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
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ padding: '5px 10px', fontSize: '0.82rem' }}
            >
              <option value="ALL">📅 すべての年 ({notes.length}件)</option>
              {availableYears.map((yr) => (
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
              placeholder="タイトル・コメントで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '30px', paddingRight: searchQuery ? '26px' : '10px', fontSize: '0.82rem', width: '100%' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
            表示: <strong style={{ color: '#fff' }}>{sortedNotes.length}</strong> / {notes.length} 件
          </span>
          {(selectedYear !== 'ALL' || searchQuery) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedYear('ALL');
                setSearchQuery('');
              }}
              style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
            >
              クリア
            </button>
          )}
        </div>
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
                <option value="未選択">⚪ 選択しない (評価なし)</option>
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
            const isEditing = editingId === n.id;

            if (isEditing) {
              return (
                <form key={n.id} onSubmit={handleSaveEdit} className="glass-card" style={{ padding: '18px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #38bdf8' }}>
                  <div style={{ fontWeight: 700, marginBottom: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={16} /> 決算・IRコメントの編集
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>日付</label>
                      <input type="date" className="input-field" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>決算・IR評価</label>
                      <select className="input-field" style={{ width: '100%' }} value={editEvaluation} onChange={(e) => setEditEvaluation(e.target.value as any)}>
                        <option value="未選択">⚪ 選択しない (評価なし)</option>
                        <option value="ポジ">🟢 ポジティブ (計画超過・良好)</option>
                        <option value="ニュートラル">🟡 ニュートラル (想定内・インライン)</option>
                        <option value="ネガ">🔴 ネガティブ (進捗遅れ・懸念あり)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>タイトル</label>
                    <input type="text" className="input-field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%' }} />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>分析コメント</label>
                    <textarea className="input-field" rows={4} value={editComment} onChange={(e) => setEditComment(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>キャンセル</button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      <Save size={13} /> 更新保存
                    </button>
                  </div>
                </form>
              );
            }

            const hasEvaluation = n.evaluation ? n.evaluation !== '未選択' : Boolean(n.impression);
            const isPos = n.evaluation === 'ポジ' || n.impression === 'positive';
            const isNeg = n.evaluation === 'ネガ' || n.impression === 'negative';
            const evalText = n.evaluation || (n.impression === 'positive' ? 'ポジ' : n.impression === 'negative' ? 'ネガ' : 'ニュートラル');
            const evalColor = isPos ? 'var(--stock-up)' : isNeg ? 'var(--stock-down)' : 'var(--text-secondary)';
            
            const displayTitle = n.title || n.period || '';
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
                    {displayTitle && <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff' }}>{displayTitle}</span>}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayDate}</span>
                    
                    {hasEvaluation && (
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
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isReadOnly && (
                      <>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '3px 6px', color: '#38bdf8' }} 
                          onClick={() => startEdit(n)} 
                          title="コメントを編集"
                        >
                          <Edit3 size={13} />
                        </button>
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
