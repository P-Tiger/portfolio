import { Client } from '@notionhq/client';
import {
  Asset,
  AssetRaw,
  Category,
  CategoryBreakdown,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PerformancePoint,
  PortfolioData,
} from './types';
import { fetchAllPrices, fetchCryptoHistory, fetchGoldHistory, fetchUsdHistory, HistoryPoint } from './prices';

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
      const p = prices[raw.symbol.toUpperCase()];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
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

  // Fetch ALL data in parallel: prices + crypto history + gold history + usd history
  const allPromises: Promise<unknown>[] = [
    fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd),
    hasGold ? fetchGoldHistory(30) : Promise.resolve([] as HistoryPoint[]),
    hasUsd ? fetchUsdHistory(30) : Promise.resolve([] as HistoryPoint[]),
    ...cryptoIds.map((id) => fetchCryptoHistory(id, 30).then((h) => ({ id, history: h }))),
  ];

  const allResults = await Promise.all(allPromises);
  const prices = allResults[0] as Awaited<ReturnType<typeof fetchAllPrices>>;
  const goldHistory = allResults[1] as HistoryPoint[];
  const usdHistory = allResults[2] as HistoryPoint[];

  const cryptoHistoryMap = new Map<string, HistoryPoint[]>();
  for (let i = 3; i < allResults.length; i++) {
    const item = allResults[i] as { id: string; history: HistoryPoint[] };
    if (item.history.length > 0) cryptoHistoryMap.set(item.id, item.history);
  }

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

  // Build performance history from shared data (no extra fetches)
  const performanceHistory = buildPerformanceHistory(assets, cryptoHistoryMap);
  const categoryPerformance = buildCategoryPerformance(assets, cryptoHistoryMap, goldHistory, usdHistory);

  return {
    assets: assets.sort((a, b) => b.totalValue - a.totalValue),
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    categoryBreakdown,
    performanceHistory,
    categoryPerformance,
    lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
}

function buildPerformanceHistory(
  assets: Asset[],
  cryptoHistoryMap: Map<string, HistoryPoint[]>,
): PerformancePoint[] {
  if (cryptoHistoryMap.size === 0) return [];

  // Non-crypto assets have constant value (use current)
  const nonCryptoValue = assets
    .filter((a) => a.category !== 'crypto')
    .reduce((sum, a) => sum + a.totalValue, 0);

  // Crypto assets grouped by symbol
  const cryptoAssets = assets.filter((a) => a.category === 'crypto' && a.symbol);

  // Use the first crypto's timestamps as reference timeline
  const refHistory = cryptoHistoryMap.values().next().value;
  if (!refHistory || refHistory.length === 0) return [];

  const points: PerformancePoint[] = [];
  for (let i = 0; i < refHistory.length; i += Math.max(1, Math.floor(refHistory.length / 30))) {
    const ts = refHistory[i].timestamp;
    let cryptoValue = 0;

    for (const asset of cryptoAssets) {
      const history = cryptoHistoryMap.get(asset.symbol.toLowerCase());
      if (!history) {
        cryptoValue += asset.totalValue;
        continue;
      }
      // Find closest price point
      const closest = history.reduce((prev, curr) =>
        Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
      );
      cryptoValue += asset.quantity * closest.price;
    }

    points.push({
      date: new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: Math.round(cryptoValue + nonCryptoValue),
    });
  }

  // Add current point
  const totalNow = assets.reduce((s, a) => s + a.totalValue, 0);
  points.push({
    date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    value: Math.round(totalNow),
  });

  return points;
}

function buildCategoryPerformance(
  assets: Asset[],
  cryptoHistoryMap: Map<string, HistoryPoint[]>,
  goldHistory: HistoryPoint[],
  usdHistory: HistoryPoint[],
): Partial<Record<Category, PerformancePoint[]>> {
  const result: Partial<Record<Category, PerformancePoint[]>> = {};

  // Crypto: reuse shared cryptoHistoryMap (no duplicate CoinGecko calls)
  const cryptoAssets = assets.filter((a) => a.category === 'crypto' && a.symbol);
  if (cryptoAssets.length > 0 && cryptoHistoryMap.size > 0) {
    const refHistory = cryptoHistoryMap.values().next().value;
    if (refHistory && refHistory.length > 0) {
      const points: PerformancePoint[] = [];
      for (let i = 0; i < refHistory.length; i += Math.max(1, Math.floor(refHistory.length / 30))) {
        const ts = refHistory[i].timestamp;
        let total = 0;
        for (const asset of cryptoAssets) {
          const history = cryptoHistoryMap.get(asset.symbol.toLowerCase());
          if (!history) { total += asset.totalValue; continue; }
          const closest = history.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          total += asset.quantity * closest.price;
        }
        points.push({
          date: new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          value: Math.round(total),
        });
      }
      // Add current point
      const cryptoNow = cryptoAssets.reduce((s, a) => s + a.totalValue, 0);
      points.push({
        date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        value: Math.round(cryptoNow),
      });
      result.crypto = points;
    }
  }

  // Gold: use pre-fetched history
  const goldAssets = assets.filter((a) => a.category === 'gold');
  if (goldAssets.length > 0 && goldHistory.length >= 2) {
    const totalQty = goldAssets.reduce((s, a) => s + a.quantity, 0);
    const points: PerformancePoint[] = goldHistory.map((h) => ({
      date: new Date(h.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: Math.round(totalQty * h.price),
    }));
    const goldNow = goldAssets.reduce((s, a) => s + a.totalValue, 0);
    points.push({
      date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: Math.round(goldNow),
    });
    result.gold = points;
  }

  // USD: use pre-fetched history
  const usdAssets = assets.filter((a) => a.category === 'usd');
  if (usdAssets.length > 0 && usdHistory.length >= 2) {
    const totalQty = usdAssets.reduce((s, a) => s + a.quantity, 0);
    const points: PerformancePoint[] = usdHistory.map((h) => ({
      date: new Date(h.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: Math.round(totalQty * h.price),
    }));
    const usdNow = usdAssets.reduce((s, a) => s + a.totalValue, 0);
    points.push({
      date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: Math.round(usdNow),
    });
    result.usd = points;
  }

  // Stock & Cash: no historical API available, skip

  return result;
}
