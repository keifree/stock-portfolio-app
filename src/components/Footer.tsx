import React from 'react';
import { Download, Share2, Database, RefreshCw, Search } from 'lucide-react';

interface FooterProps {
  isReadOnly?: boolean;
  isSyncing?: boolean;
  onOpenShareModal: () => void;
  onExportJSON: () => void;
  onRefreshAllStocks?: () => void;
  onOpenDebugModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  isReadOnly = false,
  isSyncing = false,
  onOpenShareModal,
  onExportJSON,
  onRefreshAllStocks,
  onOpenDebugModal
}) => {
  return (
    <footer
      className="glass-card"
      style={{
        padding: '16px 24px',
        marginTop: '24px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}
    >
      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        © {new Date().getFullYear()} 日本株ポートフォリオ管理ダッシュボード
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* デバッグ診断ボタン */}
        {onOpenDebugModal && (
          <button
            className="btn btn-secondary"
            onClick={onOpenDebugModal}
            style={{ padding: '7px 14px', fontSize: '0.82rem', borderColor: 'rgba(250, 204, 21, 0.4)', color: '#facc15' }}
            title="通信・株価データの生デバッグ＆キャッシュ破棄診断"
          >
            <Search size={14} />
            <span>🔍 デバッグ診断</span>
          </button>
        )}

        {/* 強制最新再取得ボタン */}
        {onRefreshAllStocks && (
          <button
            className="btn btn-secondary"
            onClick={onRefreshAllStocks}
            disabled={isSyncing}
            style={{
              padding: '7px 14px',
              fontSize: '0.82rem',
              borderColor: 'rgba(56, 189, 248, 0.5)',
              background: isSyncing ? 'rgba(56, 189, 248, 0.15)' : undefined
            }}
            title="全銘柄の株価データをキャッシュ破棄して強制最新再同期"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} style={{ color: 'var(--accent-cyan)' }} />
            <span>{isSyncing ? '株価同期中...' : '最新株価同期'}</span>
          </button>
        )}

        {/* JSON出力ボタン */}
        <button
          className="btn btn-secondary"
          onClick={onExportJSON}
          style={{ padding: '7px 14px', fontSize: '0.82rem', borderColor: 'var(--accent-cyan)' }}
          title="バックアップ用JSON保存"
        >
          <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
          <span>📦 JSON保存</span>
        </button>

        {/* 共有設定ボタン */}
        <button
          className="btn btn-secondary"
          onClick={onOpenShareModal}
          style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          title="共有・自動同期設定"
        >
          <Share2 size={15} />
          <span>共有設定</span>
        </button>
      </div>
    </footer>
  );
};
