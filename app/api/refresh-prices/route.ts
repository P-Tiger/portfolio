import { NextResponse } from 'next/server';
import { getCachedAssets } from '@/lib/notion';
import { fetchAllPrices } from '@/lib/prices';

export async function GET() {
  try {
    const assets = await getCachedAssets();

    // Determine which price sources we need
    const hasGold = assets.some((a) => a.category === 'gold');
    const hasUsd = assets.some((a) => a.category === 'usd');

    // Collect all crypto and stock tickers
    const cryptoIds = assets
      .filter((a) => a.category === 'crypto')
      .map((a) => a.symbol.toLowerCase());
    const stockTickers = assets
      .filter((a) => a.category === 'stock')
      .map((a) => a.symbol.toUpperCase());

    // Fetch fresh prices
    const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);

    return NextResponse.json(prices);
  } catch (e) {
    console.error('[api/refresh-prices] Error:', (e as Error).message);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
