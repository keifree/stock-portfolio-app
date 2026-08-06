import React, { useState } from 'react';
import { StockItem } from '../types';
import { createBackup, restoreFromBackup, getBackupInfo } from '../services/storage';
import { TrendingUp, PlusCircle, Save, RotateCcw, Share2, Download, Lock, Check, Eye, Edit3 } from 'lucide-react';

interface HeaderProps {
  stocks: StockItem[];
  isReadOnly?: boolean;
  onOpenAddModal: () => void;
  onOpenShareModal: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stocks,
  isReadOnly = false,
  onOpenAddModal,
  onOpenShareModal,
  onExportCSV
}) => {
  const totalCount = stocks.length;
  const backupInfo = getBackupInfo();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const editorUrl = baseUrl;
  const readonlyUrl = `${baseUrl}?mode=readonly`;

  const copyToClipboard = (text: string, type: 'readonly' | 'editor') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  const handleSaveBackup = () => {
    if (isReadOnly) return;
    const res = createBackup();
    if (res.success) {
      alert(`【データ保存完了】\n保存件数: ${res.count}件\n保存日時: ${res.time}\n\nバックアップ保存いたしました。`);
      window.location.reload();
    } else {
      alert('保存に失敗しました。');
    }
  };

  const handleRestoreBackup = () => {
    if (isReadOnly) return;
    if (!backupInfo.exists) {
      alert('保存されたバックアップデータがありません。');
      return;
    }

    if (window.confirm(`【データ復元の確認】\n保存日時: ${backupInfo.time}\n保存件数: ${backupInfo.count}件\n\n復元しますか？`)) {
      const res = restoreFromBackup();
      if (res.success) {
        alert(`【復元完了】\n${res.count}件の銘柄データを復元いたしました。`);
        window.location.reload();
      } else {
        alert('復元に失敗しました。');
      }
    }
  };

  return (
    <header>
      <div className="glass-card header-glass">
        <div className="logo-area">
          <div className="logo-icon">
            <TrendingUp size={22} />
          </div>
          <div className="title-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>株式ポートフォリオ & 銘柄管理</h1>
              {isReadOnly ? (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  background: 'rgba(234, 179, 8, 0.25)',
                  color: '#facc15',
                  border: '1px solid rgba(234, 179, 8, 0.5)',
                  borderRadius: '12px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Lock size={11} /> 👁 閲覧専用モード中
                </span>
              ) : (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Edit3 size={11} /> ✏️ 編集許可モード
                </span>
              )}
            </div>
            <p>登録銘柄一覧・リアルタイムデータ・決算IRメモ・手動保存＆復旧対応</p>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* ワンクリック共有権限コピーボタンペア */}
          <button
            className="btn btn-secondary"
            onClick={() => copyToClipboard(readonlyUrl, 'readonly')}
            title="メンバー配布用：閲覧専用リンクをコピー"
            style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.3)', fontSize: '0.76rem', padding: '4px 8px' }}
          >
            {copiedLink === 'readonly' ? <Check size={13} /> : <Eye size={13} />}
            <span>{copiedLink === 'readonly' ? '閲覧URLコピー完了' : '👁 閲覧専用URL'}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => copyToClipboard(editorUrl, 'editor')}
            title="管理者用：編集許可リンクをコピー"
            style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', borderColor: 'rgba(56, 189, 248, 0.3)', fontSize: '0.76rem', padding: '4px 8px' }}
          >
            {copiedLink === 'editor' ? <Check size={13} /> : <Edit3 size={13} />}
            <span>{copiedLink === 'editor' ? '編集URLコピー完了' : '✏️ 編集許可URL'}</span>
          </button>

          {!isReadOnly && (
            <button className="btn btn-primary" onClick={onOpenAddModal}>
              <PlusCircle size={15} />
              <span>銘柄を追加</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              className="btn btn-secondary"
              onClick={handleSaveBackup}
              title="データを保存"
              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
            >
              <Save size={15} />
              <span>データ保存</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              className="btn btn-secondary"
              onClick={handleRestoreBackup}
              title="データを復元"
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
            >
              <RotateCcw size={15} />
              <span>データ復元</span>
            </button>
          )}
          
          <button className="btn btn-secondary" onClick={onExportCSV}>
            <Download size={15} />
            <span>CSV</span>
          </button>

          <button className="btn btn-outline" onClick={onOpenShareModal}>
            <Share2 size={15} />
            <span>詳細設定</span>
          </button>
        </div>
      </div>

      {/* サマリーバー */}
      <div className="stats-bar" style={{ marginTop: '8px' }}>
        <div className="glass-card stat-card">
          <div className="stat-info">
            <div className="stat-label">登録銘柄数</div>
            <div className="stat-value">{totalCount} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>銘柄</span></div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-info">
            <div className="stat-label">現在の表示モード</div>
            <div className="stat-value" style={{ fontSize: '0.88rem', color: isReadOnly ? '#facc15' : 'var(--accent-cyan)' }}>
              {isReadOnly ? '👁 閲覧専用モード (Read-Only)' : '✏️ 編集許可モード (Full Editor)'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
