'use client';

import { DisplayCurrency, formatMoney, formatQuantity } from '@/lib/format';
import { getAssetIcon } from '@/lib/icons';
import { Asset, TransactionRaw } from '@/lib/types';
import { memo, useEffect, useMemo, useState } from 'react';
import { CategoryBadge } from './CategoryBadge';
import { TransactionDetailModal } from './TransactionDetailModal';

type SortKey = 'name' | 'category' | 'quantity' | 'buyPrice' | 'currentPrice' | 'totalValue' | 'pnl' | 'pnlPercent';
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE = 10;

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-zinc-600 ml-1">⇅</span>;
  return <span className="text-emerald-400 ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export const AssetTable = memo(function AssetTable({
  assets,
  showCategory = true,
  transactions = [],
  displayCurrency,
  usdToVndRate,
}: {
  assets: Asset[];
  showCategory?: boolean;
  transactions?: TransactionRaw[];
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('totalValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [page, setPage] = useState(0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      if (sortKey === 'category') {
        aVal = a.category;
        bVal = b.category;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [assets, sortKey, sortDirection]);

  useEffect(() => {
    setPage(0);
  }, [sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedAssets.length / PAGE_SIZE);
  const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;
  const pagedAssets = sortedAssets.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  if (assets.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500">Chưa có tài sản nào</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden contain-layout">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Chi tiết tài sản ({assets.length})</h2>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th
                className="text-left px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Tài sản
                  <SortIndicator active={sortKey === 'name'} direction={sortDirection} />
                </div>
              </th>
              {showCategory && (
                <th
                  className="text-left px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center">
                    Loại
                    <SortIndicator active={sortKey === 'category'} direction={sortDirection} />
                  </div>
                </th>
              )}
              <th
                className="text-right px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center justify-end">
                  SL
                  <SortIndicator active={sortKey === 'quantity'} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-right px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => handleSort('buyPrice')}
              >
                <div className="flex items-center justify-end">
                  Giá TB ròng
                  <SortIndicator active={sortKey === 'buyPrice'} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-right px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => handleSort('currentPrice')}
              >
                <div className="flex items-center justify-end">
                  Giá TT
                  <SortIndicator active={sortKey === 'currentPrice'} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-right px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => handleSort('totalValue')}
              >
                <div className="flex items-center justify-end">
                  Giá trị
                  <SortIndicator active={sortKey === 'totalValue'} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-right px-5 py-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                onClick={() => handleSort('pnl')}
              >
                <div className="flex items-center justify-end">
                  P&L
                  <SortIndicator active={sortKey === 'pnl'} direction={sortDirection} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedAssets.map((asset, i) => {
              const isPnlPositive = asset.pnl >= 0;
              const isSoldOut = asset.quantity <= 0;
              return (
                <tr
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${isSoldOut ? 'opacity-50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getAssetIcon(asset.category, asset.symbol)}</span>
                      <div>
                        <span className="text-white font-medium">{asset.name}</span>
                        {asset.change24h !== 0 && (
                          <span
                            className={`ml-2 text-xs ${asset.change24h >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}
                          >
                            24h: {asset.change24h >= 0 ? '+' : ''}
                            {asset.change24h.toFixed(1)}%
                          </span>
                        )}
                        {asset.note && <span className="block text-xs text-zinc-500 mt-0.5">{asset.note}</span>}
                      </div>
                    </div>
                  </td>
                  {showCategory && (
                    <td className="px-5 py-3">
                      <CategoryBadge category={asset.category} />
                    </td>
                  )}
                  <td className="px-5 py-3 text-right text-zinc-300">{formatQuantity(asset.quantity)}</td>
                  <td className={`px-5 py-3 text-right ${asset.buyPrice < 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {formatMoney(asset.buyPrice, displayCurrency, usdToVndRate)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-300">
                    {formatMoney(asset.currentPrice, displayCurrency, usdToVndRate)}
                  </td>
                  <td className="px-5 py-3 text-right text-white font-medium">
                    {formatMoney(asset.totalValue, displayCurrency, usdToVndRate)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={isPnlPositive ? 'text-emerald-400' : 'text-red-400'}>
                      {isPnlPositive ? '+' : ''}
                      {formatMoney(asset.pnl, displayCurrency, usdToVndRate)}
                    </span>
                    <span className={`block text-xs ${isPnlPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      {isPnlPositive ? '+' : ''}
                      {asset.pnlPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards with sort options */}
      <div className="md:hidden">
        <div className="px-5 py-3 border-b border-zinc-800 flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { key: 'totalValue' as SortKey, label: 'Giá trị' },
            { key: 'pnl' as SortKey, label: 'P&L' },
            { key: 'quantity' as SortKey, label: 'SL' },
            { key: 'buyPrice' as SortKey, label: 'Giá TB' },
            { key: 'currentPrice' as SortKey, label: 'Giá TT' },
            { key: 'name' as SortKey, label: 'Tên' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => handleSort(option.key)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                sortKey === option.key
                  ? 'bg-emerald-400/20 text-emerald-400'
                  : 'bg-zinc-800/50 text-zinc-400 active:text-zinc-200'
              }`}
            >
              {option.label} {sortKey === option.key && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          ))}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {pagedAssets.map((asset, i) => {
            const isPnlPositive = asset.pnl >= 0;
            const isSoldOut = asset.quantity <= 0;
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`p-4 hover:bg-zinc-800/20 cursor-pointer ${isSoldOut ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getAssetIcon(asset.category, asset.symbol)}</span>
                    <div>
                      <span className="text-white font-medium">{asset.name}</span>
                      {showCategory && (
                        <span className="ml-2">
                          <CategoryBadge category={asset.category} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPnlPositive ? '+' : ''}
                      {asset.pnlPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500">Giá trị: </span>
                    <span className="text-white">{formatMoney(asset.totalValue, displayCurrency, usdToVndRate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">P&L: </span>
                    <span className={isPnlPositive ? 'text-emerald-400' : 'text-red-400'}>
                      {isPnlPositive ? '+' : ''}
                      {formatMoney(asset.pnl, displayCurrency, usdToVndRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">SL: </span>
                    <span className="text-zinc-300">{formatQuantity(asset.quantity)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">Giá TT: </span>
                    <span className="text-zinc-300">
                      {formatMoney(asset.currentPrice, displayCurrency, usdToVndRate)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300 active:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span className="text-xs text-zinc-500">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300 active:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}

      {selectedAsset && (
        <TransactionDetailModal
          asset={selectedAsset}
          transactions={transactions}
          displayCurrency={displayCurrency}
          usdToVndRate={usdToVndRate}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
});
