'use client';

import { DisplayCurrency, formatMoney } from '@/lib/format';
import { CATEGORY_COLORS, CategoryBreakdown } from '@/lib/types';
import { memo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';

export const CategoryCards = memo(function CategoryCards({
  data,
  displayCurrency,
  usdToVndRate,
}: {
  data: CategoryBreakdown[];
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {data.map((item, i) => {
        const isPnlPositive = item.pnl >= 0;
        return (
          <div
            key={item.category}
            className={`theme-bg-card theme-border border rounded-xl p-4 hover:theme-border-light transition-colors`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] }} />
              <span className="text-sm theme-text-secondary">{item.name}</span>
              <span className="text-xs theme-text-muted ml-auto">{item.count} assets</span>
            </div>

            <p className="text-lg font-bold theme-text-primary mb-1">
              <AnimatedNumber value={item.value} formatter={(v) => formatMoney(v, displayCurrency, usdToVndRate)} />
            </p>

            <p className="text-xs theme-text-muted mb-2">
              Vốn: <span className="theme-text-secondary">{formatMoney(item.cost, displayCurrency, usdToVndRate)}</span>
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                P&L: {isPnlPositive ? '+' : ''}
                {formatMoney(item.pnl, displayCurrency, usdToVndRate)}
              </span>
              <span className={`text-xs ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPnlPositive ? '+' : ''}
                {item.pnlPercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
              <span>Tỷ trọng</span>
              <span>{item.percent.toFixed(1)}%</span>
            </div>

            <div className="w-full theme-bg-tertiary rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
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
});
