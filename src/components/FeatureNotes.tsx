import React, { useState } from 'react';
import { FeatureNote } from '../types';
import { Plus, Trash2, Save, FileText } from 'lucide-react';

interface FeatureNotesProps {
  notes: FeatureNote[];
  onUpdateNotes: (notes: FeatureNote[]) => void;
  isReadOnly?: boolean;
}

export const FeatureNotes: React.FC<FeatureNotesProps> = ({
  notes = [],
  onUpdateNotes,
  isReadOnly = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newNote: FeatureNote = {
      id: `feat-${Date.now()}`,
      date,
      title: title.trim(),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    onUpdateNotes([newNote, ...notes]);
    
    // リセット
    setTitle('');
    setComment('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    if (confirm('この銘柄特徴・分析メモを削除しますか？')) {
      onUpdateNotes(notes.filter((n) => n.id !== id));
    }
  };

  // 日付の降順（新しい順）でソート
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>銘柄特徴・分析 ({notes.length}件)</h3>
        {!isAdding && !isReadOnly && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
            <Plus size={15} />
            <span>特徴・分析メモを追加</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-cyan)' }}>
          <div style={{ fontWeight: 700, marginBottom: '14px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} /> 銘柄特徴・分析の追加
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>日付</label>
            <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '220px' }} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>タイトル (自由入力)</label>
            <input type="text" className="input-field" placeholder="例: ビジネスモデル・強み・競合優位性" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>特徴・分析内容 (自由入力・大きな枠)</label>
            <textarea className="input-field" rows={6} placeholder="競合他社との違い、参入障壁、中長期成長ストーリー、経営者の手腕など..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
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
            まだ特徴・分析メモが記録されていません。上のボタンから追加してください。
          </div>
        ) : (
          sortedNotes.map((n) => (
            <div key={n.id} className="glass-card" style={{ padding: '18px 20px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff' }}>{n.title || '無題の特徴メモ'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.date}</span>
                </div>
                {!isReadOnly && (
                  <button className="btn btn-secondary btn-sm" style={{ padding: '3px 6px', color: 'var(--stock-down)' }} onClick={() => handleDelete(n.id)} title="削除">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {n.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
