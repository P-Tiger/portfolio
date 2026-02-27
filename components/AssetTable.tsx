'use client';

import { Asset } from '@/lib/types';
import { formatVNDFull, formatQuantity } from '@/lib/format';
import { CategoryBadge } from './CategoryBadge';

export function AssetTable({ assets, showCategory = true }: { assets: Asset[]; showCategory?: boolean }) {
  if (assets.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500">Chưa có tài sản nào</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Chi tiết tài sản ({assets.length})</h2>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-5 py-3 font-medium">Tài sản</th>
              {showCategory && <th className="text-left px-5 py-3 font-medium">Loại</th>}
              <th className="text-right px-5 py-3 font-medium">SL</th>
              <th className="text-right px-5 py-3 font-medium">Giá mua</th>
              <th className="text-right px-5 py-3 font-medium">Giá TT</th>
              <th className="text-right px-5 py-3 font-medium">Giá trị</th>
              <th className="text-right px-5 py-3 font-medium">P&L</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, i) => {
              const isPnlPositive = asset.pnl >= 0;
              return (
                <tr
                  key={asset.id}
                  className={`animate-fade-in delay-${Math.min(i + 1, 8)} border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors`}
                >
                  <td className="px-5 py-3">
                    <span className="text-white font-medium">{asset.name}</span>
                    {asset.change24h !== 0 && (
                      <span className={`ml-2 text-xs ${asset.change24h >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        24h: {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(1)}%
                      </span>
                    )}
                    {asset.note && <span className="block text-xs text-zinc-500 mt-0.5">{asset.note}</span>}
                  </td>
                  {showCategory && (
                    <td className="px-5 py-3">
                      <CategoryBadge category={asset.category} />
                    </td>
                  )}
                  <td className="px-5 py-3 text-right text-zinc-300">{formatQuantity(asset.quantity)}</td>
                  <td className="px-5 py-3 text-right text-zinc-300">{formatVNDFull(asset.buyPrice)}</td>
                  <td className="px-5 py-3 text-right text-zinc-300">{formatVNDFull(asset.currentPrice)}</td>
                  <td className="px-5 py-3 text-right text-white font-medium">{formatVNDFull(asset.totalValue)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={isPnlPositive ? 'text-emerald-400' : 'text-red-400'}>
                      {isPnlPositive ? '+' : ''}{formatVNDFull(asset.pnl)}
                    </span>
                    <span className={`block text-xs ${isPnlPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      {isPnlPositive ? '+' : ''}{asset.pnlPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-zinc-800/50">
        {assets.map((asset, i) => {
          const isPnlPositive = asset.pnl >= 0;
          return (
            <div key={asset.id} className={`animate-fade-in delay-${Math.min(i + 1, 8)} p-4 hover:bg-zinc-800/20`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-white font-medium">{asset.name}</span>
                  {showCategory && (
                    <span className="ml-2"><CategoryBadge category={asset.category} /></span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPnlPositive ? '+' : ''}{asset.pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500">Giá trị: </span>
                  <span className="text-white">{formatVNDFull(asset.totalValue)}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">P&L: </span>
                  <span className={isPnlPositive ? 'text-emerald-400' : 'text-red-400'}>
                    {isPnlPositive ? '+' : ''}{formatVNDFull(asset.pnl)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">SL: </span>
                  <span className="text-zinc-300">{formatQuantity(asset.quantity)}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">Giá TT: </span>
                  <span className="text-zinc-300">{formatVNDFull(asset.currentPrice)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
