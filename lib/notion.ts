import { Client } from '@notionhq/client';
import {
  Asset,
  AssetRaw,
  Category,
  CategoryBreakdown,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PortfolioData,
} from './types';
import { fetchAllPrices } from './prices';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const databaseId = process.env.NOTION_DATABASE_ID!;

// In-memory cache for Notion data (5 minutes TTL)
let notionCache: { data: AssetRaw[]; timestamp: number } | null = null;
const NOTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

function getProperty(page: Record<string, unknown>, name: string): unknown {
  const props = page.properties as Record<string, Record<string, unknown>>;
  return props[name];
}

function getTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const title = (prop as Record<string, unknown>).title as Array<{ plain_text: string }>;
  return title?.[0]?.plain_text ?? '';
}

function getSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const select = (prop as Record<string, unknown>).select as { name: string } | null;
  return select?.name ?? '';
}

function getNumber(prop: unknown): number {
  if (!prop || typeof prop !== 'object') return 0;
  return ((prop as Record<string, unknown>).number as number) ?? 0;
}

function getRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const rich = (prop as Record<string, unknown>).rich_text as Array<{ plain_text: string }>;
  return rich?.[0]?.plain_text ?? '';
}

async function fetchAssetsFromNotion(): Promise<AssetRaw[]> {
  const now = Date.now();
  if (notionCache && (now - notionCache.timestamp) < NOTION_CACHE_TTL) {
    console.log('[notion] Using cached data (age:', Math.round((now - notionCache.timestamp) / 1000), 's)');
    return notionCache.data;
  }

  console.log('[notion] Fetching fresh data from Notion...');
  const response = await notion.databases.query({
    database_id: databaseId,
    sorts: [{ property: 'Category', direction: 'ascending' }],
  });

  const data = response.results.map((page) => {
    const p = page as unknown as Record<string, unknown>;
    return {
      id: p.id as string,
      name: getTitle(getProperty(p, 'Name')),
      category: getSelect(getProperty(p, 'Category')).toLowerCase() as Category,
      quantity: getNumber(getProperty(p, 'Quantity')),
      buyPrice: getNumber(getProperty(p, 'Buy Price')),
      symbol: getRichText(getProperty(p, 'Symbol')).trim(),
      note: getRichText(getProperty(p, 'Note')),
    };
  });

  notionCache = { data, timestamp: now };
  console.log('[notion] Cached', data.length, 'assets');
  return data;
}

export async function getCachedAssets(): Promise<AssetRaw[]> {
  return fetchAssetsFromNotion();
}

function resolvePrice(raw: AssetRaw, prices: Record<string, { vnd: number; change24h: number }>): Asset {
  let currentPrice = 0;
  let change24h = 0;

  switch (raw.category) {
    case 'crypto': {
      const p = prices[raw.symbol.toLowerCase()];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'stock': {
      const key = raw.symbol.toUpperCase();
      const p = prices[key];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      else { console.warn(`[resolve] Stock "${raw.name}" symbol="${key}" not found in prices. Available:`, Object.keys(prices).filter(k => !k.startsWith('__'))); }
      break;
    }
    case 'gold': {
      const p = prices['__gold__'];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'usd': {
      const p = prices['__usd__'];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'cash': {
      currentPrice = 1;
      break;
    }
  }

  const totalValue = raw.quantity * currentPrice;
  const totalCost = raw.quantity * raw.buyPrice;
  const pnl = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

  return { ...raw, currentPrice, change24h, totalValue, totalCost, pnl, pnlPercent };
}

export async function getPortfolioData(): Promise<PortfolioData> {
  const rawAssets = await fetchAssetsFromNotion();

  const cryptoIds = rawAssets.filter((a) => a.category === 'crypto' && a.symbol).map((a) => a.symbol.toLowerCase());
  const stockTickers = rawAssets.filter((a) => a.category === 'stock' && a.symbol).map((a) => a.symbol.toUpperCase());
  const hasGold = rawAssets.some((a) => a.category === 'gold');
  const hasUsd = rawAssets.some((a) => a.category === 'usd');

  const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);
  const assets: Asset[] = rawAssets.map((raw) => resolvePrice(raw, prices));

  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCost = assets.reduce((sum, a) => sum + a.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const catMap = new Map<Category, { value: number; cost: number; count: number }>();
  for (const asset of assets) {
    const existing = catMap.get(asset.category) ?? { value: 0, cost: 0, count: 0 };
    existing.value += asset.totalValue;
    existing.cost += asset.totalCost;
    existing.count += 1;
    catMap.set(asset.category, existing);
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([cat, d]) => {
      const pnl = d.value - d.cost;
      return {
        category: cat,
        name: CATEGORY_LABELS[cat] || cat,
        value: d.value,
        cost: d.cost,
        pnl,
        pnlPercent: d.cost > 0 ? (pnl / d.cost) * 100 : 0,
        percent: totalValue > 0 ? (d.value / totalValue) * 100 : 0,
        color: CATEGORY_COLORS[cat] || '#6b7280',
        count: d.count,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    assets: assets.sort((a, b) => b.totalValue - a.totalValue),
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    categoryBreakdown,
    lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
}
