'use client';

import { Asset, Category, CATEGORY_LABELS, CATEGORY_COLORS, TransactionRaw } from '@/lib/types';
import { formatVND } from '@/lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { PnlBarChart } from './PnlBarChart';
import { AssetTable } from './AssetTable';

interface Props {
  category: Category;
  assets: Asset[];
  transactions: TransactionRaw[];
}

export function CategoryTab({ category, assets, transactions }: Props) {
  const label = CATEGORY_LABELS[category];
  const color = CATEGORY_COLORS[category];
  const totalValue = assets.reduce((s, a) => s + a.totalValue, 0);
  const totalCost = assets.reduce((s, a) => s + a.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isPnlPositive = totalPnl >= 0;

  if (assets.length === 0) {
    return (
      <div className="tab-content flex items-center justify-center py-20">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          </div>
          <p className="text-zinc-400">Chưa có tài sản {label} nào</p>
          <p className="text-zinc-600 text-sm mt-1">Thêm trên Notion Database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content space-y-6">
      {/* Category header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-xl font-bold text-white">{label}</h2>
        <span className="text-sm text-zinc-500">{assets.length} tài sản</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="animate-fade-in delay-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-400 text-xs mb-2">Tổng giá trị {label}</p>
          <p className="text-xl font-bold text-white">
            <AnimatedNumber value={totalValue} formatter={formatVND} />
            <span className="text-xs text-zinc-500 ml-1 font-normal">VND</span>
          </p>
        </div>
        <div className="animate-fade-in delay-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-400 text-xs mb-2">Vốn ròng</p>
          <p className="text-xl font-bold text-white">
            <AnimatedNumber value={totalCost} formatter={formatVND} />
            <span className="text-xs text-zinc-500 ml-1 font-normal">VND</span>
          </p>
        </div>
        <div className="animate-fade-in delay-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-400 text-xs mb-2">P&L</p>
          <p className={`text-xl font-bold ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPnlPositive ? '+' : ''}
            <AnimatedNumber value={totalPnl} formatter={formatVND} />
            <span className="text-xs ml-1 font-normal">VND</span>
          </p>
        </div>
        <div className="animate-fade-in delay-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-400 text-xs mb-2">% Lời/Lỗ</p>
          <p className={`text-xl font-bold ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPnlPositive ? '+' : ''}
            {totalPnlPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {assets.length > 1 && <PnlBarChart assets={assets} />}
      <AssetTable assets={assets} showCategory={false} transactions={transactions} />
    </div>
  );
}
