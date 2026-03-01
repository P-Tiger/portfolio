'use client';

import { DisplayCurrency, formatMoney, getCurrencyLabel } from '@/lib/format';
import { Asset } from '@/lib/types';

export function PnlBarChart({
  assets,
  displayCurrency,
  usdToVndRate,
}: {
  assets: Asset[];
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  const data = assets
    .filter((a) => a.transactionCount > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10)
    .map((a) => ({
      name: a.name.length > 12 ? a.name.slice(0, 12) + '...' : a.name,
      pnl: a.pnl,
      pnlPercent: a.pnlPercent,
    }));

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Lời / Lỗ theo tài sản</h2>
        <div className="h-[300px] flex items-center justify-center text-zinc-600 text-sm">Chưa có dữ liệu</div>
      </div>
    );
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)));
  const hasNeg = data.some((d) => d.pnl < 0);
  const hasPos = data.some((d) => d.pnl >= 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Lời / Lỗ theo tài sản</h2>
      <div className="space-y-2">
        {data.map((item, i) => {
          const isPositive = item.pnl >= 0;
          const barWidth = maxAbs > 0 ? (Math.abs(item.pnl) / maxAbs) * 100 : 0;
          return (
            <div key={i} className="group relative flex items-center gap-2 h-7">
              <span className="text-xs text-zinc-400 w-[100px] truncate text-right shrink-0">{item.name}</span>
              <div className="flex-1 flex items-center h-full">
                {hasNeg && hasPos ? (
                  /* Two-sided layout when there are both positive and negative values */
                  <div className="relative w-full h-full flex items-center">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700" />
                    {isPositive ? (
                      <div className="absolute left-1/2 h-5 rounded-r" style={{
                        width: `${barWidth / 2}%`,
                        backgroundColor: '#34d399',
                        opacity: 0.85,
                      }} />
                    ) : (
                      <div className="absolute right-1/2 h-5 rounded-l" style={{
                        width: `${barWidth / 2}%`,
                        backgroundColor: '#f87171',
                        opacity: 0.85,
                      }} />
                    )}
                  </div>
                ) : (
                  /* Single-sided layout */
                  <div className="relative w-full h-full flex items-center">
                    <div className="h-5 rounded" style={{
                      width: `${barWidth}%`,
                      backgroundColor: isPositive ? '#34d399' : '#f87171',
                      opacity: 0.85,
                      minWidth: barWidth > 0 ? '2px' : '0',
                    }} />
                  </div>
                )}
              </div>
              {/* Tooltip on hover */}
              <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 -top-12 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm z-10 whitespace-nowrap pointer-events-none">
                <p className="font-medium text-white">{item.name}</p>
                <p className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
                  {isPositive ? '+' : ''}
                  {formatMoney(item.pnl, displayCurrency, usdToVndRate)} {getCurrencyLabel(displayCurrency)}
                </p>
                <p className="text-zinc-400">
                  {isPositive ? '+' : ''}
                  {item.pnlPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
