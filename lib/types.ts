export type Category = 'crypto' | 'gold' | 'usd' | 'stock' | 'cash';

export interface AssetRaw {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  buyPrice: number;
  symbol: string;
  note: string;
}

export interface Asset extends AssetRaw {
  currentPrice: number;
  change24h: number;
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
}

export interface CategoryBreakdown {
  category: Category;
  name: string;
  value: number;
  cost: number;
  pnl: number;
  pnlPercent: number;
  percent: number;
  color: string;
  count: number;
}

export interface PerformancePoint {
  date: string;
  value: number;
}

export interface PortfolioData {
  assets: Asset[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  categoryBreakdown: CategoryBreakdown[];
  performanceHistory: PerformancePoint[];
  categoryPerformance: Partial<Record<Category, PerformancePoint[]>>;
  lastUpdated: string;
}

export type PriceInfo = {
  vnd: number;
  change24h: number;
};

export type PriceMap = Record<string, PriceInfo>;

export const CATEGORY_LABELS: Record<Category, string> = {
  crypto: 'Crypto',
  gold: 'Vàng',
  usd: 'USD',
  stock: 'Cổ phiếu',
  cash: 'Tiền mặt',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  crypto: '#f97316',
  gold: '#eab308',
  usd: '#22c55e',
  stock: '#3b82f6',
  cash: '#6b7280',
};

export const ALL_CATEGORIES: Category[] = ['crypto', 'gold', 'usd', 'stock', 'cash'];
