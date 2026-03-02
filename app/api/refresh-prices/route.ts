import { getCachedAssets } from '@/lib/notion';
import { fetchAllPricesCached } from '@/lib/prices';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const ttlParam = Number(request.nextUrl.searchParams.get('cacheTtl') || '30');
    const cacheTtlSec = Number.isFinite(ttlParam) ? Math.max(5, Math.min(120, Math.round(ttlParam))) : 30;

    const { assets } = await getCachedAssets();

    // Determine which price sources we need
    const hasGold = assets.some((a) => a.category === 'gold');
    const hasUsd = assets.some((a) => a.category === 'usd');

    // Collect all crypto and stock tickers
    const cryptoIds = assets.filter((a) => a.category === 'crypto').map((a) => a.symbol.toLowerCase());
    const stockTickers = assets.filter((a) => a.category === 'stock').map((a) => a.symbol.toUpperCase());
    const includeUsdRate = hasUsd || cryptoIds.length > 0;

    // Fetch fresh prices
    const prices = await fetchAllPricesCached(cryptoIds, stockTickers, hasGold, includeUsdRate, cacheTtlSec);

    return NextResponse.json(prices);
  } catch (e) {
    console.error('[api/refresh-prices] Error:', (e as Error).message);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
