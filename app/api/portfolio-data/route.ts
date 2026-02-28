import { NextResponse } from 'next/server';
import { getPortfolioDataWithoutPrices } from '@/lib/notion';

export async function GET() {
  try {
    // Only return Notion data (cached), don't fetch prices here
    const portfolioData = await getPortfolioDataWithoutPrices();
    return NextResponse.json({
      assets: portfolioData.assets,
      totalValue: portfolioData.totalValue,
      totalCost: portfolioData.totalCost,
      totalPnl: portfolioData.totalPnl,
      totalPnlPercent: portfolioData.totalPnlPercent,
      categoryBreakdown: portfolioData.categoryBreakdown,
      lastUpdated: portfolioData.lastUpdated,
      rawAssets: portfolioData.rawAssets,
    });
  } catch (e) {
    console.error('[api/portfolio-data] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch portfolio data' },
      { status: 500 },
    );
  }
}
