import { readHistory } from '@/lib/history';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tf = request.nextUrl.searchParams.get('tf') || '1m';
    const cat = request.nextUrl.searchParams.get('cat') || 'overview';
    const points = await readHistory(tf, cat);
    return NextResponse.json(points);
  } catch (e) {
    console.error('[api/history] Error:', (e as Error).message);
    return NextResponse.json([], { status: 500 });
  }
}
