import React from 'react';
import { StockItem } from '../types';
import { Plus, Download, Share2, Lock, Unlock, Database } from 'lucide-react';

interface HeaderProps {
  stocks: StockItem[];
  isReadOnly?: boolean;
  onOpenAddModal: () => void;
  onOpenShareModal: () => void;
  onExportJSON: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stocks = [],
  isReadOnly = false,
  onOpenAddModal,
  onOpenShareModal,
  onExportJSON
}) => {
  const totalCount = (stocks || []).length;
  const positiveCount = (stocks || []).filter((s) => s.changePrevPct > 0).length;
  const negativeCount = (stocks || []).filter((s) => s.changePrevPct < 0).length;

  return (
    <header className="glass-card header-container" style={{ padding: '16px 24px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* タイトル ＆ モードバッジ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            📈 日本株ポートフォリオ管理ダッシュボード
          </h1>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '20px',
              background: isReadOnly ? 'rgba(234, 179, 8, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              color: isReadOnly ? '#facc15' : 'var(--accent-cyan)',
              border: `1px solid ${isReadOnly ? 'rgba(234, 179, 8, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isReadOnly ? <Lock size={12} /> : <Unlock size={12} />}
            {isReadOnly ? '閲覧専用 (Read-Only)' : '編集許可 (Editor)'}
          </span>
        </div>

        {/* 統計サマリー ＆ 操作アクション */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              登録銘柄: <strong style={{ color: '#fff' }}>{totalCount}</strong> 件
            </span>
            <span style={{ color: '#f87171' }}>
              値上がり: <strong>{positiveCount}</strong>
            </span>
            <span style={{ color: '#34d399' }}>
              値下がり: <strong>{negativeCount}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* 銘柄追加ボタン */}
            {!isReadOnly && (
              <button className="btn btn-primary" onClick={onOpenAddModal} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                <Plus size={15} />
                <span>銘柄を追加</span>
              </button>
            )}

            {/* JSON出力ボタン */}
            <button className="btn btn-secondary" onClick={onExportJSON} style={{ padding: '6px 14px', fontSize: '0.82rem', borderColor: 'var(--accent-cyan)' }} title="バックアップ用JSON保存">
              <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>📦 JSON保存</span>
            </button>

            {/* 共有設定ボタン */}
            <button className="btn btn-secondary" onClick={onOpenShareModal} style={{ padding: '6px 14px', fontSize: '0.82rem' }} title="共有・自動同期設定">
              <Share2 size={15} />
              <span>共有設定</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
