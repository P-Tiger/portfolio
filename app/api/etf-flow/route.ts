import { NextRequest, NextResponse } from 'next/server';

const VALID_RANGES = ['30d', '1y', 'all'];

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') || '30d';

  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.coinmarketcap.com/data-api/v3/etf/overview/netflow/chart?category=all&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        next: { revalidate: 300 }, // Cache 5 minutes
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from CoinMarketCap' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ETF flow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
