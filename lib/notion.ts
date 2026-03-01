import { Client } from '@notionhq/client';
import { fetchAllPrices } from './prices';
import {
  Asset,
  AssetRaw,
  Category,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CategoryBreakdown,
  PortfolioData,
  TransactionRaw,
  TransactionStatus,
  TransactionType,
} from './types';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const databaseId = process.env.NOTION_DATABASE_ID!;

// In-memory cache for Notion data (5 minutes TTL)
let notionCache: { data: TransactionRaw[]; timestamp: number } | null = null;
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

// Read Status from multiple possible Notion property types (select, status, number, rich_text)
function getStatusValue(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;

  // Notion "select" type
  if (p.select && typeof p.select === 'object') {
    return ((p.select as { name: string }).name ?? '').trim();
  }
  // Notion native "status" type
  if (p.status && typeof p.status === 'object') {
    return ((p.status as { name: string }).name ?? '').trim();
  }
  // Notion "number" type
  if (p.number !== undefined && p.number !== null) {
    return String(p.number);
  }
  // Notion "rich_text" type
  if (Array.isArray(p.rich_text) && p.rich_text.length > 0) {
    return ((p.rich_text as Array<{ plain_text: string }>)[0]?.plain_text ?? '').trim();
  }
  return '';
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

function getDate(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const dateObj = (prop as Record<string, unknown>).date as { start: string } | null;
  return dateObj?.start ?? '';
}

async function fetchTransactionsFromNotion(): Promise<TransactionRaw[]> {
  const now = Date.now();
  if (notionCache && now - notionCache.timestamp < NOTION_CACHE_TTL) {
    console.log('[notion] Using cached data (age:', Math.round((now - notionCache.timestamp) / 1000), 's)');
    return notionCache.data;
  }

  console.log('[notion] Fetching fresh transactions from Notion...');

  const allResults: Array<Record<string, unknown>> = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: 'Date', direction: 'ascending' }],
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    allResults.push(...response.results.map((r) => r as unknown as Record<string, unknown>));
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  const data: TransactionRaw[] = allResults
    .map((p) => {
      const qty = getNumber(getProperty(p, 'Quantity'));
      return {
        id: p.id as string,
        name: getTitle(getProperty(p, 'Name')),
        date: getDate(getProperty(p, 'Date')),
        type: (getSelect(getProperty(p, 'Type')) || 'Buy') as TransactionType,
        symbol: getRichText(getProperty(p, 'Symbol')).trim(),
        category: getSelect(getProperty(p, 'Category')).toLowerCase() as Category,
        price: getNumber(getProperty(p, 'Price')),
        quantity: qty,
        note: getRichText(getProperty(p, 'Note')),
        status: getStatusValue(getProperty(p, 'Status')) as TransactionStatus | '',
      };
    })
    .filter((tx) => tx.quantity > 0);

  const hiddenCount = data.filter((tx) => tx.status === TransactionStatus.Hidden).length;
  if (hiddenCount > 0) {
    console.log(`[notion] ${hiddenCount} transactions marked as hidden (status=-1)`);
  }

  notionCache = { data, timestamp: now };
  console.log('[notion] Cached', data.length, 'transactions');
  return data;
}

function aggregateTransactions(txs: TransactionRaw[]): AssetRaw[] {
  const groups = new Map<string, TransactionRaw[]>();

  for (const tx of txs) {
    // Group by symbol::category (or name::category if no symbol)
    const key = (tx.symbol || tx.name) + '::' + tx.category;
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }

  const assets: AssetRaw[] = [];

  for (const txList of Array.from(groups.values())) {
    // Skip entire asset if any transaction is marked hidden
    if (txList.some((tx) => tx.status === TransactionStatus.Hidden)) {
      continue;
    }

    let totalBuyQty = 0;
    let totalSellQty = 0;
    let totalCostGross = 0;
    let totalProceeds = 0;

    for (const tx of txList) {
      if (tx.type === 'Buy') {
        totalBuyQty += tx.quantity;
        totalCostGross += tx.quantity * tx.price;
      } else {
        totalSellQty += tx.quantity;
        totalProceeds += tx.quantity * tx.price;
      }
    }

    const holdings = totalBuyQty - totalSellQty;
    if (holdings < 0) {
      console.warn(`[aggregate] Negative holdings for "${txList[0].name}" (${holdings}). Treating as 0.`);
    }

    const netCost = totalCostGross - totalProceeds;
    const avgNetCost = holdings > 0 ? netCost / holdings : 0;
    const avgBuyPrice = totalBuyQty > 0 ? totalCostGross / totalBuyQty : 0;

    // Use the latest transaction's name/note
    const latestTx = txList[txList.length - 1];

    assets.push({
      id: latestTx.id,
      name: latestTx.name,
      category: latestTx.category,
      quantity: Math.max(holdings, 0),
      buyPrice: avgNetCost,
      symbol: latestTx.symbol,
      note: latestTx.note,
      totalBuyQty,
      totalSellQty,
      totalCostGross,
      totalProceeds,
      avgBuyPrice,
      transactionCount: txList.length,
    });
  }

  return assets;
}

export async function getCachedAssets(): Promise<{ assets: AssetRaw[]; transactions: TransactionRaw[] }> {
  const txs = await fetchTransactionsFromNotion();
  return { assets: aggregateTransactions(txs), transactions: txs };
}

function resolvePrice(raw: AssetRaw, prices: Record<string, { vnd: number; change24h: number }>): Asset {
  let currentPrice = 0;
  let change24h = 0;

  switch (raw.category) {
    case 'crypto': {
      const p = prices[raw.symbol.toLowerCase()];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'stock': {
      const key = raw.symbol.toUpperCase();
      const p = prices[key];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      } else {
        console.warn(`[resolve] Stock "${raw.name}" symbol="${key}" not found in prices.`);
      }
      break;
    }
    case 'gold': {
      const p = prices['__gold__'];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'usd': {
      const p = prices['__usd__'];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'cash': {
      currentPrice = 1;
      break;
    }
  }

  let totalValue: number;
  let totalCost: number;
  let pnl: number;
  let pnlPercent: number;

  if (raw.quantity <= 0) {
    // Fully sold: realized P&L only
    totalValue = 0;
    totalCost = raw.totalCostGross;
    pnl = raw.totalProceeds - raw.totalCostGross;
    pnlPercent = raw.totalCostGross > 0 ? (pnl / raw.totalCostGross) * 100 : 0;
  } else {
    // Still holding: unrealized P&L using netCost
    totalValue = raw.quantity * currentPrice;
    const netCost = raw.totalCostGross - raw.totalProceeds;
    totalCost = netCost;
    pnl = totalValue - netCost;
    pnlPercent = raw.totalCostGross > 0 ? (pnl / raw.totalCostGross) * 100 : 0;
  }

  return { ...raw, currentPrice, change24h, totalValue, totalCost, pnl, pnlPercent };
}

function buildPortfolioData(assets: Asset[]): PortfolioData {
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
    usdToVndRate: 0,
  };
}

export async function getPortfolioDataWithoutPrices(): Promise<PortfolioData> {
  const { assets: rawAssets, transactions } = await getCachedAssets();

  const assets: Asset[] = rawAssets.map((raw) => {
    const netCost = raw.totalCostGross - raw.totalProceeds;
    return {
      ...raw,
      currentPrice: 0,
      change24h: 0,
      totalValue: 0,
      totalCost: raw.quantity > 0 ? netCost : raw.totalCostGross,
      pnl: raw.quantity <= 0 ? raw.totalProceeds - raw.totalCostGross : -netCost,
      pnlPercent:
        raw.quantity <= 0
          ? raw.totalCostGross > 0
            ? ((raw.totalProceeds - raw.totalCostGross) / raw.totalCostGross) * 100
            : 0
          : -100,
    };
  });

  const portfolioData = buildPortfolioData(assets);
  return { ...portfolioData, rawAssets, transactions };
}

export async function getPortfolioData(): Promise<PortfolioData> {
  const { assets: rawAssets, transactions } = await getCachedAssets();

  const cryptoIds = rawAssets.filter((a) => a.category === 'crypto' && a.symbol).map((a) => a.symbol.toLowerCase());
  const stockTickers = rawAssets.filter((a) => a.category === 'stock' && a.symbol).map((a) => a.symbol.toUpperCase());
  const hasGold = rawAssets.some((a) => a.category === 'gold');
  const hasUsd = rawAssets.some((a) => a.category === 'usd');

  const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);
  const assets: Asset[] = rawAssets.map((raw) => resolvePrice(raw, prices));

  const portfolioData = buildPortfolioData(assets);
  return { ...portfolioData, usdToVndRate: prices.__usd__?.vnd ?? 0, rawAssets, transactions };
}
