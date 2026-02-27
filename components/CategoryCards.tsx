'use client';

import { CategoryBreakdown, CATEGORY_COLORS } from '@/lib/types';
import { formatVND } from '@/lib/format';
import { AnimatedNumber } from './AnimatedNumber';

export function CategoryCards({ data }: { data: CategoryBreakdown[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {data.map((item, i) => {
        const isPnlPositive = item.pnl >= 0;
        return (
          <div
            key={item.category}
            className={`animate-fade-in delay-${i + 1} bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] }} />
              <span className="text-sm text-zinc-400">{item.name}</span>
              <span className="text-xs text-zinc-600 ml-auto">{item.count} assets</span>
            </div>

            <p className="text-lg font-bold text-white mb-1">
              <AnimatedNumber value={item.value} formatter={formatVND} />
            </p>

            <p className="text-xs text-zinc-500 mb-2">
              Vốn: <span className="text-zinc-400">{formatVND(item.cost)}</span>
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                P&L: {isPnlPositive ? '+' : ''}
                {formatVND(item.pnl)}
              </span>
              <span className={`text-xs ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPnlPositive ? '+' : ''}
                {item.pnlPercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>Tỷ trọng</span>
              <span>{item.percent.toFixed(1)}%</span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full animate-slide-right"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: CATEGORY_COLORS[item.category],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
