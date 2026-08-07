import React, { useState } from 'react';
import { DistributionComment } from '../types';
import { Plus, Trash2, Edit2, ExternalLink, Calendar, Send, Check, X, Search } from 'lucide-react';

interface DistributionCommentsProps {
  comments: DistributionComment[];
  onUpdateComments: (comments: DistributionComment[]) => void;
  isReadOnly?: boolean;
}

export const DistributionComments: React.FC<DistributionCommentsProps> = ({
  comments = [],
  onUpdateComments,
  isReadOnly = false
}) => {
  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [date, setDate] = useState<string>(getTodayStr());
  const [title, setTitle] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 年絞り込み・フリーワード検索ステート
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!title.trim() || !comment.trim()) {
      alert('タイトルとコメント本文を入力してください。');
      return;
    }

    if (editingId) {
      // 編集の保存
      const updated = comments.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            date: date || getTodayStr(),
            title: title.trim(),
            link: link.trim() || undefined,
            comment: comment.trim()
          };
        }
        return item;
      });
      onUpdateComments(updated);
      setEditingId(null);
    } else {
      // 新規作成
      const newItem: DistributionComment = {
        id: `dist-${Date.now()}`,
        date: date || getTodayStr(),
        title: title.trim(),
        link: link.trim() || undefined,
        comment: comment.trim(),
        createdAt: new Date().toISOString()
      };
      onUpdateComments([newItem, ...comments]);
    }

    // フォームクリア
    setTitle('');
    setLink('');
    setComment('');
    setDate(getTodayStr());
  };

  const handleStartEdit = (item: DistributionComment) => {
    setEditingId(item.id);
    setDate(item.date || getTodayStr());
    setTitle(item.title || '');
    setLink(item.link || '');
    setComment(item.comment || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setLink('');
    setComment('');
    setDate(getTodayStr());
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    if (window.confirm('この配信コメントを削除してもよろしいですか？')) {
      const updated = comments.filter((item) => item.id !== id);
      onUpdateComments(updated);
    }
  };

  // 年の選択肢リストを動的抽出
  const availableYears = Array.from(
    new Set(
      comments
        .map((c) => {
          const match = (c.date || '').match(/^(\d{4})/);
          return match ? match[1] : null;
        })
        .filter((y): y is string => y !== null)
    )
  ).sort((a, b) => b.localeCompare(a));

  // フィルタリング処理
  const filteredComments = comments.filter((item) => {
    const d = item.date || '';
    if (selectedYear !== 'ALL' && !d.startsWith(selectedYear)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const t = (item.title || '').toLowerCase();
      const c = (item.comment || '').toLowerCase();
      if (!t.includes(q) && !c.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const sortedComments = [...filteredComments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* フォーム入力エリア（編集許可時） */}
      {!isReadOnly && (
        <form
          onSubmit={handleAddOrUpdate}
          className="glass-card"
          style={{
            padding: '20px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '12px'
          }}
        >
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} />
            <span>{editingId ? '配信コメントを編集' : '新しい配信コメントを追加'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                配信日付
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                タイトル (自由入力) *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="例: 第2四半期 決算サマリー・配信メモ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              配信リンク (URL 自由入力)
            </label>
            <input
              type="url"
              className="input-field"
              placeholder="例: https://example.com/distribution/report-01"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              コメント本文 (大きめ) *
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="配信に関する詳細コメントやIR受領時の重要ポイントを記録してください..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              style={{ width: '100%', fontSize: '0.88rem', lineHeight: '1.6', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                <X size={15} />
                <span>キャンセル</span>
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.82rem' }}
            >
              {editingId ? <Check size={15} /> : <Plus size={15} />}
              <span>{editingId ? '変更を保存' : '配信コメントを追加'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 一覧表示エリア */}
      <div className="glass-card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Send size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>配信コメント一覧 ({comments.length}件)</span>
          </h3>
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
            background: 'rgba(0, 0, 0, 0.25)',
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
                <option value="ALL">📅 すべての年 ({comments.length}件)</option>
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
                placeholder="タイトル・本文で検索..."
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
              表示: <strong style={{ color: '#fff' }}>{sortedComments.length}</strong> / {comments.length} 件
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

        {sortedComments.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            現在登録されている配信コメントはありません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sortedComments.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* ヘッダー行 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: 'var(--accent-cyan)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Calendar size={13} />
                      {item.date}
                    </span>

                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {item.title}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          color: '#38bdf8',
                          borderColor: 'rgba(56, 189, 248, 0.3)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>配信元を開く</span>
                      </a>
                    )}

                    {!isReadOnly && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleStartEdit(item)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="編集"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDelete(item.id)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* コメント本文 (大きめ) */}
                <div
                  style={{
                    fontSize: '0.9rem',
                    lineHeight: '1.65',
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.04)'
                  }}
                >
                  {item.comment}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
