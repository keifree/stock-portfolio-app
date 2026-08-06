export type StockScale = '大型' | '中型' | '小型';

export interface FinancialQuarterNote {
  id: string;
  date?: string; // 日付 (YYYY-MM-DD)
  title?: string; // タイトル
  evaluation?: '未選択' | 'ポジ' | 'ニュートラル' | 'ネガ'; // 決算・IR評価
  comment?: string; // 分析コメント (大きな枠)
  pinned?: boolean; // 最上部ピン留めフラグ
  
  // 過去互換用
  period?: string;
  releaseDate?: string;
  revenue?: number;
  operatingProfit?: number;
  netProfit?: number;
  progressRate?: number;
  impression?: 'positive' | 'neutral' | 'negative';
  summaryNote?: string;
  updatedAt: string;
}

export interface IRComment {
  id: string;
  date: string; // 日付 YYYY-MM-DD
  title: string; // 見出し・トピック
  category: string;
  content: string; // 詳細内容・分析コメント
  author?: string; // 記録者名
  tags?: string[];
  createdAt: string;
}

export interface FeatureNote {
  id: string;
  date?: string; // 日付
  title?: string; // タイトル
  comment?: string; // コメント欄 (大きな枠)
  createdAt: string;
}

export interface HistoricalPoint {
  date: string;
  price: number;
}

export interface StockItem {
  id: string;
  code: string; // 銘柄コード (例: "7203", "9984", "AAPL")
  name: string; // 銘柄名
  currentPrice: number; // 現在価格
  previousPrice: number; // 前日価格
  changePrevPct: number; // 前日比（％）
  price5DaysAgo: number; // 5日前価格
  change5dPct: number; // 5日前比（％）
  price20DaysAgo: number; // 20日前価格
  change20dPct: number; // 20日前比（％）
  priceYearStart: number; // 年始価格
  changeYtdPct: number; // 年始比（％）
  
  adoptDate: string; // 銘柄採用日 (YYYY-MM-DD)
  adoptPrice: number; // 採用時価格
  changeAdoptPct: number; // 採用時比（％）
  
  sector: string; // セクター情報 (例: "電気機器", "情報・通信業", "自動車")
  marketCap: number; // 時価総額（億円）
  scale: StockScale; // 株価規模感: 大型（5000億以上）、中型、小型（1000億以下）
  
  tabId: string; // 所属するタブID ("tab-30", "tab-a", "tab-b" 等)
  
  financialNotes: FinancialQuarterNote[]; // 決算・IRコメント
  irComments: IRComment[]; // 各種ログ一覧
  featureNotes?: FeatureNote[]; // 銘柄特徴・分析
  chartHistory?: HistoricalPoint[]; // チャート表示用過去株価履歴
  
  updatedAt: string; // データ最終更新時刻
}

export interface TabConfig {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface SyncSettings {
  autoSync: boolean;
  syncIntervalMinutes: number;
  apiEndpoint?: string;
  cloudSyncEnabled?: boolean;
  apiKey?: string;
  shareUrl?: string;
  lastSyncedAt?: string;
}
