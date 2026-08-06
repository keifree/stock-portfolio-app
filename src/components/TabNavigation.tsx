import React, { useState } from 'react';
import { TabConfig, StockItem } from '../types';
import { Folder, Plus } from 'lucide-react';

interface TabNavigationProps {
  tabs: TabConfig[];
  activeTabId: string;
  stocks: StockItem[];
  onSelectTab: (tabId: string) => void;
  onAddTab: (name: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  stocks,
  onSelectTab,
  onAddTab
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
    <div className="tabs-container">
      <div className="tabs-list">
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
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAdding(true)}
            style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.78rem' }}
          >
            <Plus size={14} />
            <span>グループ追加</span>
          </button>
        )}
      </div>
    </div>
  );
};
