'use client';

import { DisplayCurrency, formatMoney, getCurrencyLabel } from '@/lib/format';
import { PortfolioData } from '@/lib/types';
import { memo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';

interface PortfolioSummaryProps {
  data: PortfolioData;
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}

export const PortfolioSummary = memo(function PortfolioSummary({
  data,
  displayCurrency,
  usdToVndRate,
}: PortfolioSummaryProps) {
  const isPnlPositive = data.totalPnl >= 0;

  const cards = [
    {
      label: 'Tổng tài sản',
      value: data.totalValue,
      suffix: getCurrencyLabel(displayCurrency),
      color: 'theme-text-primary',
    },
    {
      label: 'Vốn ròng',
      value: data.totalCost,
      suffix: getCurrencyLabel(displayCurrency),
      color: 'theme-text-primary',
    },
    {
      label: 'Lời / Lỗ (P&L)',
      value: data.totalPnl,
      suffix: getCurrencyLabel(displayCurrency),
      color: isPnlPositive ? 'text-emerald-400' : 'text-red-400',
      prefix: isPnlPositive ? '+' : '',
      sub: `${isPnlPositive ? '+' : ''}${data.totalPnlPercent.toFixed(2)}%`,
    },
    {
      label: 'Số tài sản',
      value: data.assets.length,
      suffix: 'assets',
      color: 'theme-text-primary',
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`theme-bg-card theme-border border rounded-xl p-4 lg:p-5 hover:theme-border-light transition-colors`}
        >
          <p className="theme-text-secondary text-xs sm:text-sm mb-2">{card.label}</p>
          <p className={`text-xl lg:text-2xl font-bold ${card.color}`}>
            {card.prefix}
            {card.isCount ? (
              <AnimatedNumber value={card.value} />
            ) : (
              <AnimatedNumber value={card.value} formatter={(v) => formatMoney(v, displayCurrency, usdToVndRate)} />
            )}
            <span className="text-xs sm:text-sm theme-text-muted ml-1 font-normal">{card.suffix}</span>
          </p>
          {card.sub && <p className={`text-xs sm:text-sm mt-1 ${card.color}`}>{card.sub}</p>}
        </div>
      ))}
    </div>
  );
});
