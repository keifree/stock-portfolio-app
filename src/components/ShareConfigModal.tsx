import React, { useState } from 'react';
import { SyncSettings, StockItem, TabConfig } from '../types';
import { createBackup, restoreFromBackup, getBackupInfo } from '../services/storage';
import { X, Save, RotateCcw, Download, Cloud, Globe, Copy, Check, Lock, Edit3, Upload } from 'lucide-react';

interface ShareConfigModalProps {
  settings: SyncSettings;
  stocks: StockItem[];
  tabs: TabConfig[];
  isReadOnly?: boolean;
  onClose: () => void;
  onSaveSettings: (settings: SyncSettings) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onImportCSVClick: () => void; // CSVインポート発火コールバックを追加
}

export const ShareConfigModal: React.FC<ShareConfigModalProps> = ({
  settings,
  stocks,
  isReadOnly = false,
  onClose,
  onSaveSettings,
  onExportCSV,
  onExportJSON,
  onImportCSVClick
}) => {
  const [autoSync, setAutoSync] = useState(settings?.autoSync || false);
  const [endpoint, setEndpoint] = useState(settings?.apiEndpoint || '');
  const [copiedReadonly, setCopiedReadonly] = useState(false);
  const [copiedEditor, setCopiedEditor] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const editorUrl = baseUrl;

  // 当月の期限限定キー(YYMMハッシュ)を自動生成
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const currentKey = btoa(`stock-${yyyy}-${mm}`).substring(0, 8); // 今月限定のキー
  
  const readonlyUrl = `${baseUrl}?mode=readonly&key=${currentKey}`;

  const backupInfo = getBackupInfo();

  const handleCopyReadonly = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(readonlyUrl);
      setCopiedReadonly(true);
      setTimeout(() => setCopiedReadonly(false), 2500);
    }
  };

  const handleCopyEditor = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(editorUrl);
      setCopiedEditor(true);
      setTimeout(() => setCopiedEditor(false), 2500);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      autoSync: autoSync,
      apiEndpoint: endpoint
    });
    alert('設定を更新しました。');
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={22} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>権限付き共有 ＆ バックアップ設定</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* 1. 権限選択付き共有URL発行 */}
          <div className="glass-card" style={{ padding: '18px', marginBottom: '16px', background: 'rgba(15, 23, 42, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Globe size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>1. アクセス権限別 共有URL発行 (1ヶ月限定リンク対応)</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              用途に合わせて「閲覧専用リンク」または「編集許可リンク」をコピーして共有配布できます。
              <br />
              <strong style={{ color: 'var(--stock-up)' }}>※ 閲覧専用URLはセキュリティ保護のため、今月（{yyyy}年{mm}月）末に自動的に無効化（アクセス不可）になります。月が変わるごとに管理者が新しくコピーして配布してください。</strong>
            </p>

            {/* A: 閲覧専用URL */}
            <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(234, 179, 8, 0.08)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#facc15', marginBottom: '6px' }}>
                <Lock size={14} /> 閲覧専用URL ({yyyy}年{mm}月限定リンク)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  className="input-field"
                  value={readonlyUrl}
                  style={{ flex: 1, fontSize: '0.8rem' }}
                />
                <button className="btn btn-primary" onClick={handleCopyReadonly} style={{ background: '#eab308', borderColor: '#eab308' }}>
                  {copiedReadonly ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedReadonly ? 'コピー完了' : '閲覧URLコピー'}</span>
                </button>
              </div>
            </div>

            {/* B: 編集許可URL */}
            <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                <Edit3 size={14} /> 編集許可URL (管理者・共同編集用)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  className="input-field"
                  value={editorUrl}
                  style={{ flex: 1, fontSize: '0.8rem' }}
                />
                <button className="btn btn-primary" onClick={handleCopyEditor}>
                  {copiedEditor ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedEditor ? 'コピー完了' : '編集URLコピー'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. データ保存 ＆ 復元 ＆ CSV読み込みインポート */}
          {!isReadOnly && (
            <div className="glass-card" style={{ padding: '18px', marginBottom: '16px', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Save size={18} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>2. データ保存・復元 ＆ CSVインポート</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                ローカルバックアップ状態: <span style={{ color: backupInfo.exists ? 'var(--stock-up)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {backupInfo.exists ? `${backupInfo.time} (${backupInfo.count}件保存済み)` : '未保存'}
                </span>
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleSaveBackup} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  <Save size={15} />
                  <span>ブラウザにバックアップ</span>
                </button>
                <button className="btn btn-primary" onClick={handleRestoreBackup} disabled={!backupInfo.exists} style={{ background: '#3b82f6', borderColor: '#3b82f6', opacity: backupInfo.exists ? 1 : 0.5 }}>
                  <RotateCcw size={15} />
                  <span>バックアップから復元</span>
                </button>
                
                {/* 移設されたCSVインポートボタン */}
                <button className="btn btn-primary" onClick={() => { onClose(); onImportCSVClick(); }} style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                  <Upload size={15} />
                  <span>📥 CSVファイルからインポート復元</span>
                </button>

                <button className="btn btn-secondary" onClick={onExportCSV}>
                  <Download size={15} />
                  <span>CSVエクスポート保存</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. 同期設定 */}
          <div className="glass-card" style={{ padding: '18px', background: 'rgba(15, 23, 42, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Cloud size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>3. 自動同期設定</h3>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    disabled={isReadOnly}
                  />
                  <span>株価データの自動バックグラウンド更新を有効にする</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  閉じる
                </button>
                {!isReadOnly && (
                  <button type="submit" className="btn btn-primary">
                    設定を保存
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
