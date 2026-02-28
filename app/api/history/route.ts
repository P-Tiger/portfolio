import { NextRequest, NextResponse } from 'next/server';
import { getCachedAssets } from '@/lib/notion';
import { fetchAllPrices, fetchCryptoHistory, fetchGoldHistory, fetchUsdHistory, fetchStockHistory, HistoryPoint } from '@/lib/prices';
import { AssetRaw, Category, PerformancePoint, PriceMap } from '@/lib/types';

const TIMEFRAME_DAYS: Record<string, number> = {
  '5m': 1,
  '30m': 7,
  '1h': 14,
  '4h': 30,
  '1d': 90,
  '1m': 365,
};

function getCurrentValue(raw: AssetRaw, prices: PriceMap): number {
  switch (raw.category) {
    case 'crypto':
      return raw.quantity * (prices[raw.symbol.toLowerCase()]?.vnd ?? 0);
    case 'stock':
      return raw.quantity * (prices[raw.symbol.toUpperCase()]?.vnd ?? 0);
    case 'gold':
      return raw.quantity * (prices['__gold__']?.vnd ?? 0);
    case 'usd':
      return raw.quantity * (prices['__usd__']?.vnd ?? 0);
    case 'cash':
      return raw.quantity;
    default:
      return 0;
  }
}

function formatTimestamp(ts: number, tf: string): string {
  const d = new Date(ts);
  if (tf === '5m' || tf === '30m') {
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  }
  if (tf === '1d' || tf === '1m') {
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tf = searchParams.get('tf') || '4h';
    const cat = searchParams.get('cat') || 'overview';

    const days = TIMEFRAME_DAYS[tf];
    if (!days) {
      return NextResponse.json([], { status: 400 });
    }

    const rawAssets = await getCachedAssets();

    const cryptoIds = rawAssets.filter((a) => a.category === 'crypto' && a.symbol).map((a) => a.symbol.toLowerCase());
    const stockTickers = rawAssets.filter((a) => a.category === 'stock' && a.symbol).map((a) => a.symbol.toUpperCase());
    const hasGold = rawAssets.some((a) => a.category === 'gold');
    const hasUsd = rawAssets.some((a) => a.category === 'usd');

    const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);

    const isOverview = cat === 'overview';
    const targetCategories: Category[] = isOverview ? ['crypto', 'gold', 'usd', 'stock', 'cash'] : [cat as Category];

    const relevantAssets = rawAssets.filter((a) => targetCategories.includes(a.category));
    if (relevantAssets.length === 0) {
      return NextResponse.json([]);
    }

    // Which historical data do we need?
    const needsCrypto = relevantAssets.some((a) => a.category === 'crypto' && a.symbol);
    const needsGold = relevantAssets.some((a) => a.category === 'gold');
    const needsUsd = relevantAssets.some((a) => a.category === 'usd');
    const needsStock = relevantAssets.some((a) => a.category === 'stock' && a.symbol);

    // Fetch historical data in parallel
    const [cryptoHistoryMap, goldHistory, usdHistory, stockHistoryMap] = await Promise.all([
      needsCrypto ? fetchCryptoHistories(cryptoIds, days) : new Map<string, HistoryPoint[]>(),
      needsGold && days >= 7 ? fetchGoldHistory(days) : ([] as HistoryPoint[]),
      needsUsd && days >= 7 ? fetchUsdHistory(days) : ([] as HistoryPoint[]),
      needsStock ? fetchStockHistories(stockTickers, days) : new Map<string, HistoryPoint[]>(),
    ]);

    // Constant-value assets (cash, and categories without history for short timeframes)
    const constantAssets = relevantAssets.filter((a) => {
      if (a.category === 'cash') return true;
      if (a.category === 'stock' && !stockHistoryMap.has(a.symbol.toUpperCase())) return true;
      if (a.category === 'gold' && days < 7) return true;
      if (a.category === 'usd' && days < 7) return true;
      return false;
    });
    const constantValue = constantAssets.reduce((sum, a) => sum + getCurrentValue(a, prices), 0);

    const points: PerformancePoint[] = [];

    // Use crypto or stock timestamps as reference timeline (finest granularity)
    const refHistory = cryptoHistoryMap.size > 0
      ? cryptoHistoryMap.values().next().value
      : (stockHistoryMap.size > 0 ? stockHistoryMap.values().next().value : null);

    if (refHistory && refHistory.length > 0) {
      const step = Math.max(1, Math.floor(refHistory.length / 40));
      for (let i = 0; i < refHistory.length; i += step) {
        const ts = refHistory[i].timestamp;
        let value = constantValue;

        // Crypto contribution
        for (const asset of relevantAssets.filter((a) => a.category === 'crypto' && a.symbol)) {
          const history = cryptoHistoryMap.get(asset.symbol.toLowerCase());
          if (!history) {
            value += getCurrentValue(asset, prices);
            continue;
          }
          const closest = history.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          value += asset.quantity * closest.price;
        }

        // Stock contribution
        for (const asset of relevantAssets.filter((a) => a.category === 'stock' && a.symbol)) {
          const history = stockHistoryMap.get(asset.symbol.toUpperCase());
          if (!history) {
            value += getCurrentValue(asset, prices);
            continue;
          }
          const closest = history.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          value += asset.quantity * closest.price;
        }

        // Gold contribution (interpolate to closest date)
        if (goldHistory.length > 0) {
          const goldAssets = relevantAssets.filter((a) => a.category === 'gold');
          const totalQty = goldAssets.reduce((s, a) => s + a.quantity, 0);
          const closest = goldHistory.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          value += totalQty * closest.price;
        }

        // USD contribution (interpolate to closest date)
        if (usdHistory.length > 0) {
          const usdAssets = relevantAssets.filter((a) => a.category === 'usd');
          const totalQty = usdAssets.reduce((s, a) => s + a.quantity, 0);
          const closest = usdHistory.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          value += totalQty * closest.price;
        }

        points.push({ date: formatTimestamp(ts, tf), value: Math.round(value) });
      }
    } else if (goldHistory.length >= 2 || usdHistory.length >= 2) {
      // No crypto, use gold or USD timestamps as reference
      const refHistory = goldHistory.length >= usdHistory.length ? goldHistory : usdHistory;
      for (const point of refHistory) {
        const ts = point.timestamp;
        let value = constantValue;

        if (goldHistory.length > 0) {
          const goldAssets = relevantAssets.filter((a) => a.category === 'gold');
          const totalQty = goldAssets.reduce((s, a) => s + a.quantity, 0);
          const closest = goldHistory.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          value += totalQty * closest.price;
        }

        if (usdHistory.length > 0) {
          const usdAssets = relevantAssets.filter((a) => a.category === 'usd');
          const totalQty = usdAssets.reduce((s, a) => s + a.quantity, 0);
          const closest = usdHistory.reduce((prev, curr) =>
            Math.abs(curr.timestamp - ts) < Math.abs(prev.timestamp - ts) ? curr : prev,
          );
          value += totalQty * closest.price;
        }

        points.push({ date: formatTimestamp(ts, tf), value: Math.round(value) });
      }
    }

    // Add current point
    if (points.length > 0) {
      const totalNow = relevantAssets.reduce((sum, a) => sum + getCurrentValue(a, prices), 0);
      points.push({ date: formatTimestamp(Date.now(), tf), value: Math.round(totalNow) });
    }

    return NextResponse.json(points);
  } catch (error) {
    console.error('[api/history] Error:', error);
    return NextResponse.json([]);
  }
}

async function fetchCryptoHistories(ids: string[], days: number): Promise<Map<string, HistoryPoint[]>> {
  const map = new Map<string, HistoryPoint[]>();
  await Promise.all(
    ids.map(async (id) => {
      const h = await fetchCryptoHistory(id, days);
      if (h.length > 0) map.set(id, h);
    }),
  );
  return map;
}

async function fetchStockHistories(tickers: string[], days: number): Promise<Map<string, HistoryPoint[]>> {
  const map = new Map<string, HistoryPoint[]>();
  await Promise.all(
    tickers.map(async (ticker) => {
      const h = await fetchStockHistory(ticker, days);
      if (h.length > 0) map.set(ticker.toUpperCase(), h);
    }),
  );
  return map;
}
