import { NextResponse } from 'next/server';
import { getPortfolioDataWithoutPrices } from '@/lib/notion';
import { fetchAllPrices } from '@/lib/prices';
import { Asset } from '@/lib/types';

export async function GET() {
  try {
    // Fetch Notion assets
    const portfolioData = await getPortfolioDataWithoutPrices();
    const rawAssets = portfolioData.rawAssets || [];

    // Fetch fresh prices
    const cryptoIds = rawAssets
      .filter((a) => a.category === 'crypto')
      .map((a) => a.symbol.toLowerCase());
    const stockTickers = rawAssets
      .filter((a) => a.category === 'stock')
      .map((a) => a.symbol.toUpperCase());
    const hasGold = rawAssets.some((a) => a.category === 'gold');
    const hasUsd = rawAssets.some((a) => a.category === 'usd');

    const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);

    // Resolve prices for each asset
    const resolvePrice = (
      raw: (typeof rawAssets)[0],
      priceMap: Record<string, { vnd: number; change24h: number }>,
    ) => {
      let currentPrice = 0;
      let change24h = 0;

      switch (raw.category) {
        case 'crypto': {
          const p = priceMap[raw.symbol.toLowerCase()];
          if (p) {
            currentPrice = p.vnd;
            change24h = p.change24h;
          }
          break;
        }
        case 'stock': {
          const key = raw.symbol.toUpperCase();
          const p = priceMap[key];
          if (p) {
            currentPrice = p.vnd;
            change24h = p.change24h;
          }
          break;
        }
        case 'gold': {
          const p = priceMap['__gold__'];
          if (p) {
            currentPrice = p.vnd;
            change24h = p.change24h;
          }
          break;
        }
        case 'usd': {
          const p = priceMap['__usd__'];
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

      return { currentPrice, change24h };
    };

    const assets: Asset[] = rawAssets.map((raw) => {
      const { currentPrice, change24h } = resolvePrice(raw, prices);
      const totalValue = raw.quantity * currentPrice;
      const totalCost = raw.quantity * raw.buyPrice;
      const pnl = totalValue - totalCost;
      const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return {
        ...raw,
        currentPrice,
        change24h,
        totalValue,
        totalCost,
        pnl,
        pnlPercent,
      };
    });

    // Build response with full calculations
    const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
    const totalCost = assets.reduce((sum, a) => sum + a.totalCost, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return NextResponse.json({
      assets: assets.sort((a, b) => b.totalValue - a.totalValue),
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      categoryBreakdown: portfolioData.categoryBreakdown,
      lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      rawAssets,
    });
  } catch (e) {
    console.error('[api/portfolio-data] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch portfolio data' },
      { status: 500 },
    );
  }
}
