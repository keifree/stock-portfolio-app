import React, { useState } from 'react';
import { TabConfig, StockItem } from '../types';
import { Folder, Plus } from 'lucide-react';

interface TabNavigationProps {
  tabs: TabConfig[];
  activeTabId: string;
  stocks: StockItem[];
  isReadOnly?: boolean;
  onSelectTab: (tabId: string) => void;
  onAddTab: (name: string) => void;
  onOpenAddModal?: () => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  stocks,
  isReadOnly = false,
  onSelectTab,
  onAddTab,
  onOpenAddModal
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTabName.trim()) {
      onAddTab(newTabName.trim());
      setNewTabName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="tabs-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
      <div className="tabs-list" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const count = stocks.filter((s) => s.tabId === tab.id).length;
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              className={`tab-button ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <Folder size={15} />
              <span>{tab.name}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}

        {isAdding ? (
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="input-field"
              placeholder="新規タブ名"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              autoFocus
              style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem' }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              追加
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsAdding(false)}
            >
              キャンセル
            </button>
          </form>
        ) : (
          !isReadOnly && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsAdding(true)}
              style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.78rem' }}
            >
              <Plus size={14} />
              <span>グループ追加</span>
            </button>
          )
        )}
      </div>

      {/* 銘柄追加ボタン (タブ行の右側に配置) */}
      {!isReadOnly && onOpenAddModal && (
        <button
          className="btn btn-primary"
          onClick={onOpenAddModal}
          style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          <span>銘柄を追加</span>
        </button>
      )}
    </div>
  );
};
