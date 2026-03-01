import { refreshHistoryCache, writeSnapshot } from '@/lib/history';
import { getPortfolioData } from '@/lib/notion';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getPortfolioData();

    const catValues: Record<string, number> = {};
    for (const bd of data.categoryBreakdown) {
      catValues[bd.category] = bd.value;
    }

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

    await writeSnapshot({
      date: today,
      totalValue: data.totalValue,
      totalCost: data.totalCost,
      crypto: catValues['crypto'] ?? 0,
      gold: catValues['gold'] ?? 0,
      usd: catValues['usd'] ?? 0,
      stock: catValues['stock'] ?? 0,
      cash: catValues['cash'] ?? 0,
    });

    console.log(`[cron/snapshot] Snapshot written for ${today}: ${Math.round(data.totalValue)} VND`);

    await refreshHistoryCache();

    return NextResponse.json({ ok: true, date: today, totalValue: data.totalValue });
  } catch (e) {
    console.error('[cron/snapshot] Error:', (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
