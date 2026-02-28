'use client';

import { formatVND } from '@/lib/format';
import { PortfolioData } from '@/lib/types';
import { AnimatedNumber } from './AnimatedNumber';

interface PortfolioSummaryProps {
  data: PortfolioData;
}

export function PortfolioSummary({ data }: PortfolioSummaryProps) {
  const isPnlPositive = data.totalPnl >= 0;

  const cards = [
    {
      label: 'Tổng tài sản',
      value: data.totalValue,
      suffix: 'VND',
      color: 'text-white',
    },
    {
      label: 'Vốn bỏ ra',
      value: data.totalCost,
      suffix: 'VND',
      color: 'text-white',
    },
    {
      label: 'Lời / Lỗ (P&L)',
      value: data.totalPnl,
      suffix: 'VND',
      color: isPnlPositive ? 'text-emerald-400' : 'text-red-400',
      prefix: isPnlPositive ? '+' : '',
      sub: `${isPnlPositive ? '+' : ''}${data.totalPnlPercent.toFixed(2)}%`,
    },
    {
      label: 'Số tài sản',
      value: data.assets.length,
      suffix: 'assets',
      color: 'text-white',
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`animate-fade-in delay-${i + 1} bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:p-5 hover:border-zinc-700 transition-colors`}
        >
          <p className="text-zinc-400 text-xs sm:text-sm mb-2">{card.label}</p>
          <p className={`text-xl lg:text-2xl font-bold ${card.color}`}>
            {card.prefix}
            {card.isCount ? (
              <AnimatedNumber value={card.value} />
            ) : (
              <AnimatedNumber value={card.value} formatter={formatVND} />
            )}
            <span className="text-xs sm:text-sm text-zinc-500 ml-1 font-normal">{card.suffix}</span>
          </p>
          {card.sub && <p className={`text-xs sm:text-sm mt-1 ${card.color}`}>{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}
