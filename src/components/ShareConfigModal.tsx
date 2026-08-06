import React, { useState, useRef } from 'react';
import { SyncSettings, StockItem, TabConfig } from '../types';
import { parseAndImportHorizontalFinancialCSV, saveStocks } from '../services/storage';
import { applyJapaneseNamesToAllStocks } from '../services/tseMaster';
import { X, Save, Globe, Copy, Check, Lock, Database, Upload, FileSpreadsheet, Languages } from 'lucide-react';

interface ShareConfigModalProps {
  settings: SyncSettings;
  stocks: StockItem[];
  tabs: TabConfig[];
  isReadOnly?: boolean;
  onClose: () => void;
  onSaveSettings: (settings: SyncSettings) => void;
  onExportJSON: () => void;
  onImportJSONClick: () => void;
}

export const ShareConfigModal: React.FC<ShareConfigModalProps> = ({
  settings,
  stocks,
  isReadOnly = false,
  onClose,
  onSaveSettings,
  onExportJSON,
  onImportJSONClick
}) => {
  const [gistUrl, setGistUrl] = useState(settings?.apiEndpoint || '');
  const [copiedReadonly, setCopiedReadonly] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  // 当月の期限限定キー(YYMMハッシュ)を自動生成
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const currentKey = btoa(`stock-${yyyy}-${mm}`).substring(0, 8); // 今月限定のキー
  
  // Gist URLが入力されている場合は、閲覧者用自動読み込みURLに付与
  const encodedGist = gistUrl ? encodeURIComponent(gistUrl) : '';
  const readonlyUrl = gistUrl 
    ? `${baseUrl}?mode=readonly&key=${currentKey}&dataUrl=${encodedGist}`
    : `${baseUrl}?mode=readonly&key=${currentKey}`;

  const handleCopyReadonly = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(readonlyUrl);
      setCopiedReadonly(true);
      setTimeout(() => setCopiedReadonly(false), 2500);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      apiEndpoint: gistUrl
    });
    alert('共有設定を保存しました。');
  };

  const handleHorizontalCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const res = parseAndImportHorizontalFinancialCSV(text);
      if (res.success && res.importedNotesCount > 0) {
        alert(`【取り込み完了】\n対象銘柄数: ${res.affectedStocksCount}件\n取り込み決算メモ数: ${res.importedNotesCount}件\n\n全銘柄への過去メモ一括振り分け・取り込みが完了しました！`);
        window.location.reload();
      } else {
        alert('過去メモCSVの取り込みに失敗したか、対象の銘柄コードがアプリ内に登録されていません。');
      }
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleBatchJapaneseConvert = () => {
    if (isReadOnly) return;
    const { updatedStocks, changedCount } = applyJapaneseNamesToAllStocks(stocks);
    if (changedCount > 0) {
      saveStocks(updatedStocks);
      alert(`【一括日本語化の完了】\n東証公式マスタ（約4,000銘柄）を照合し、英語表記や未設定だった [ ${changedCount} 件 ] の銘柄を東証正式日本語名＆セクターに変換・統合しました！`);
      window.location.reload();
    } else {
      alert('すべての銘柄がすでに東証正式日本語名に統一されています。');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv, .txt"
        onChange={handleHorizontalCsvImport}
        style={{ display: 'none' }}
      />

      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={22} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>JSONデータ連携 ＆ 閲覧共有設定</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* 1. Gist連動 閲覧共有URL発行 */}
          <div className="glass-card" style={{ padding: '18px', marginBottom: '16px', background: 'rgba(15, 23, 42, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Globe size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>1. Secret Gist連動 閲覧URL発行 (1ヶ月限定リンク)</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              管理者が GitHub Gist (Secret Gist) に保存した **JSON Raw URL** を以下に設定しておくと、閲覧者がアクセスした際に最新ポートフォリオを自動読み込みできます。
              <br />
              <strong style={{ color: 'var(--stock-up)' }}>※ 閲覧用リンクは今月（{yyyy}年{mm}月）末に自動でアクセス不可となります。月が変わるごとに新しいリンクを配布してください。</strong>
            </p>

            {/* Gist Raw URL設定フォーム */}
            {!isReadOnly && (
              <form onSubmit={handleSaveSettings} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--accent-cyan)' }}>
                  共有用 Secret Gist (Raw JSON URL):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://gist.githubusercontent.com/username/.../raw/data.json"
                    value={gistUrl}
                    onChange={(e) => setGistUrl(e.target.value)}
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                    <Save size={14} /> URL保存
                  </button>
                </div>
              </form>
            )}

            {/* 閲覧専用URL発行 */}
            <div style={{ padding: '12px 14px', background: 'rgba(234, 179, 8, 0.08)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
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
          </div>

          {/* 2. JSONファイルによる直接保存 ＆ 復元 */}
          <div className="glass-card" style={{ padding: '18px', marginBottom: '16px', background: 'rgba(15, 23, 42, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Database size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>2. JSONファイル保存・直接復元 ＆ 東証全銘柄日本語化</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              銘柄・決算メモ・IRログ・タブ設定など、すべてのデータを1つのJSONファイルとして出力・復元します。
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {!isReadOnly && (
                <>
                  <button className="btn btn-primary" onClick={onExportJSON} style={{ background: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', color: '#000', fontWeight: 800 }}>
                    <Database size={15} />
                    <span>📦 JSONバックアップ保存</span>
                  </button>
                  <button className="btn btn-primary" onClick={handleBatchJapaneseConvert} style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>
                    <Languages size={15} />
                    <span>🇯🇵 全銘柄を東証正式日本語名に一括変換</span>
                  </button>
                </>
              )}
              
              <button className="btn btn-primary" onClick={() => { onClose(); onImportJSONClick(); }} style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                <Upload size={15} />
                <span>📥 JSONファイルからインポート復元</span>
              </button>
            </div>
          </div>

          {/* 3. 旧スプレッドシート 過去決算メモの一括振り分けインポート */}
          {!isReadOnly && (
            <div className="glass-card" style={{ padding: '18px', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileSpreadsheet size={18} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>3. 旧スプレッドシート過去メモ一括自動振り分け</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                複数銘柄が1ファイルに入った過去メモCSV（<code>銘柄コード, 日付1, コメント1, 日付2, コメント2...</code>）を選択すると、該当する全銘柄に自動で決算メモを一発割り振りします。
              </p>

              <button className="btn btn-primary" onClick={() => csvInputRef.current?.click()} style={{ background: '#10b981', borderColor: '#10b981' }}>
                <FileSpreadsheet size={15} />
                <span>📥 旧スプレッドシート過去メモCSVを一括インポート</span>
              </button>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
