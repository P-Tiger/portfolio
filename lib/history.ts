import { Client } from '@notionhq/client';
import type { HistoryPoint } from './types';
import { PerformancePoint } from './types';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const historyDbId = process.env.NOTION_HISTORY_DB_ID!;

const CATEGORY_FIELD_MAP: Record<string, string> = {
  overview: 'TotalValue',
  crypto: 'Crypto',
  gold: 'Gold',
  usd: 'USD',
  stock: 'Stock',
  cash: 'Cash',
};

// --- In-memory cache ---
interface HistoryRow {
  date: string;
  TotalValue: number;
  TotalCost: number;
  Crypto: number;
  Gold: number;
  USD: number;
  Stock: number;
  Cash: number;
}

let cachedRows: HistoryRow[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 48 * 60 * 60 * 1000; // 48h

// --- WRITE (used by cron) ---
export async function writeSnapshot(point: HistoryPoint): Promise<void> {
  await notion.pages.create({
    parent: { database_id: historyDbId },
    properties: {
      Name: { title: [{ text: { content: `Snapshot ${point.date}` } }] },
      Date: { date: { start: point.date } },
      TotalValue: { number: point.totalValue },
      TotalCost: { number: point.totalCost },
      Crypto: { number: point.crypto },
      Gold: { number: point.gold },
      USD: { number: point.usd },
      Stock: { number: point.stock },
      Cash: { number: point.cash },
    },
  });
}

// Refresh cache from Notion (called after snapshot)
export async function refreshHistoryCache(): Promise<void> {
  const allResults: Array<Record<string, unknown>> = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: historyDbId,
      sorts: [{ property: 'Date', direction: 'ascending' }],
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });
    allResults.push(...response.results.map((r) => r as unknown as Record<string, unknown>));
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  cachedRows = allResults.map(parseFullRow);
  cacheTimestamp = Date.now();
  console.log(`[history] Cache refreshed: ${cachedRows.length} rows`);
}

// --- READ (used by /api/history) ---
export async function readHistory(timeframe: string, category?: string): Promise<PerformancePoint[]> {
  // Lazy load cache if empty or expired
  if (cachedRows.length === 0 || Date.now() - cacheTimestamp > CACHE_TTL) {
    await refreshHistoryCache();
  }

  const cutoff = getCutoffDate(timeframe);
  const valueField = CATEGORY_FIELD_MAP[category || 'overview'] || 'TotalValue';

  let rows = cachedRows;
  if (cutoff) {
    rows = rows.filter((r) => r.date >= cutoff);
  }

  return rows.map((r) => ({
    date: r.date,
    value: r[valueField as keyof HistoryRow] as number,
  }));
}

function getCutoffDate(tf: string): string | null {
  const now = new Date();
  switch (tf) {
    case '1d':
      now.setDate(now.getDate() - 1);
      break;
    case '1m':
      now.setMonth(now.getMonth() - 1);
      break;
    case '3m':
      now.setMonth(now.getMonth() - 3);
      break;
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      return null;
    default:
      now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString().split('T')[0];
}

function parseFullRow(page: Record<string, unknown>): HistoryRow {
  const props = page.properties as Record<string, Record<string, unknown>>;
  const dateObj = props.Date?.date as { start: string } | null;
  const getNum = (name: string): number => (props[name]?.number as number) ?? 0;

  return {
    date: dateObj?.start ?? '',
    TotalValue: getNum('TotalValue'),
    TotalCost: getNum('TotalCost'),
    Crypto: getNum('Crypto'),
    Gold: getNum('Gold'),
    USD: getNum('USD'),
    Stock: getNum('Stock'),
    Cash: getNum('Cash'),
  };
}
