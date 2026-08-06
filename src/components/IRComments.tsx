import React, { useState } from 'react';
import { IRComment } from '../types';
import { Plus, Trash2, Calendar, User, Tag, Save } from 'lucide-react';

interface IRCommentsProps {
  comments: IRComment[];
  onUpdateComments: (comments: IRComment[]) => void;
}

export const IRComments: React.FC<IRCommentsProps> = ({
  comments,
  onUpdateComments
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'決算説明会' | '適時開示' | 'ニュース' | '目標株価・アナリスト' | '定性メモ・分析'>('決算説明会');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('分析担当者');
  const [tagsInput, setTagsInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['IRメモ'];

    const newComment: IRComment = {
      id: `ir-${Date.now()}`,
      date,
      title,
      category,
      content,
      author,
      tags,
      createdAt: new Date().toISOString()
    };

    onUpdateComments([newComment, ...comments]);
    setTitle('');
    setContent('');
    setTagsInput('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('このIRコメントを削除しますか？')) {
      onUpdateComments(comments.filter((c) => c.id !== id));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>IRアナウンス & 定性分析タイムライン ({comments.length}件)</h3>
        {!isAdding && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
            <Plus size={15} />
            <span>IRコメントを追加</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.95)' }}>
          <div style={{ fontWeight: 700, marginBottom: '14px', color: 'var(--accent-cyan)' }}>＋ IRコメント・ニュースノートの新規投稿</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>日付</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>カテゴリー</label>
              <select className="input-field" style={{ width: '100%' }} value={category} onChange={(e) => setCategory(e.target.value as any)}>
                <option value="決算説明会">🎤 決算説明会 / Q&A</option>
                <option value="適時開示">📄 適時開示 (TDnet)</option>
                <option value="ニュース">📰 プレスリリース・ニュース</option>
                <option value="目標株価・アナリスト">🎯 レーティング・目標株価</option>
                <option value="定性メモ・分析">💡 所感・定性メモ</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>投稿者名</label>
              <input type="text" className="input-field" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>見出し・タイトル *</label>
            <input type="text" className="input-field" placeholder="例: Q2説明会での社長発言「新工場稼働で下期粗利率+2%見込む」" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>詳細分析コメント *</label>
            <textarea className="input-field" rows={4} placeholder="IRのポイント、質疑応答のハイライト、自身の考察などを具体的に記録..." value={content} onChange={(e) => setContent(e.target.value)} required style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>タグ (カンマ区切り)</label>
            <input type="text" className="input-field" placeholder="例: 下期偏重, 自社株買い, 為替感応度" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAdding(false)}>キャンセル</button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Save size={14} />
              <span>コメントを保存</span>
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {comments.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            まだIRコメントがありません。決算説明会のメモやニュースをタイムラインに追加しましょう。
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', fontWeight: 600 }}>{c.category}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {c.date}
                    </span>
                    {c.author && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} /> {c.author}
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{c.title}</h4>
                </div>

                <button className="btn btn-secondary btn-sm" style={{ padding: '3px 6px', color: 'var(--stock-down)' }} onClick={() => handleDelete(c.id)} title="削除">
                  <Trash2 size={13} />
                </button>
              </div>

              <p style={{ fontSize: '0.9rem', lineHeight: '1.65', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>{c.content}</p>

              {c.tags && c.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {c.tags.map((tag, idx) => (
                    <span key={idx} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
