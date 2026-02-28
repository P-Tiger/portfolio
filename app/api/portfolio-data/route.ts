import { getPortfolioDataWithoutPrices } from '@/lib/notion';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
      transactions: portfolioData.transactions,
    });
  } catch (e) {
    console.error('[api/portfolio-data] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch portfolio data' },
      { status: 500 },
    );
  }
}
