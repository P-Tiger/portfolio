'use client';

import { DisplayCurrency, formatMoney, formatPercent, formatQuantity } from '@/lib/format';
import { getAssetIcon } from '@/lib/icons';
import { Asset, TransactionRaw } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CategoryBadge } from './CategoryBadge';

const PAGE_SIZE = 10;

interface Props {
  asset: Asset;
  transactions: TransactionRaw[];
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
  onClose: () => void;
}

export function TransactionDetailModal({ asset, transactions, displayCurrency, usdToVndRate, onClose }: Props) {
  const [page, setPage] = useState(0);

  // Filter transactions for this asset
  const assetTxs = useMemo(() => {
    return transactions
      .filter((tx) => {
        const txKey = (tx.symbol || tx.name) + '::' + tx.category;
        const assetKey = (asset.symbol || asset.name) + '::' + asset.category;
        return txKey === assetKey;
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [transactions, asset.symbol, asset.name, asset.category]);

  const totalPages = Math.ceil(assetTxs.length / PAGE_SIZE);
  const pagedTxs = assetTxs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const isPnlPositive = asset.pnl >= 0;

  // P&L hiện tại
  const currentValue = asset.totalValue;
  const netCost = asset.totalCostGross - asset.totalProceeds;
  const pnlPercent = asset.pnlPercent;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getAssetIcon(asset.category, asset.symbol)}</span>
            <div>
              <h2 className="text-lg font-semibold text-white">{asset.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <CategoryBadge category={asset.category} />
                {asset.symbol && <span className="text-xs text-zinc-500">{asset.symbol}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* P&L hiện tại */}
        <div className="px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs">Giá trị hiện tại</p>
              <p className="text-white font-bold text-lg">{formatMoney(currentValue, displayCurrency, usdToVndRate)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs">P&L</p>
              <p className={`font-bold text-lg ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPnlPositive ? '+' : ''}
                {formatMoney(asset.pnl, displayCurrency, usdToVndRate)}
              </p>
              <p className={`text-xs ${isPnlPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                {isPnlPositive ? '+' : ''}
                {pnlPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Holdings</p>
              <p className="text-white font-medium">{formatQuantity(asset.quantity)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Giá TT</p>
              <p className="text-white font-medium">{formatMoney(asset.currentPrice, displayCurrency, usdToVndRate)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Giá TB ròng</p>
              <p className={`font-medium ${asset.buyPrice < 0 ? 'text-emerald-400' : 'text-white'}`}>
                {formatMoney(asset.buyPrice, displayCurrency, usdToVndRate)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Tổng vốn mua</p>
              <p className="text-white font-medium">
                {formatMoney(asset.totalCostGross, displayCurrency, usdToVndRate)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Tổng thu bán</p>
              <p className="text-white font-medium">
                {formatMoney(asset.totalProceeds, displayCurrency, usdToVndRate)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Vốn ròng</p>
              <p className="text-white font-medium">{formatMoney(netCost, displayCurrency, usdToVndRate)}</p>
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="overflow-y-auto flex-1">
          <div className="px-5 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-900">
            <h3 className="text-sm font-medium text-zinc-400">Lịch sử giao dịch ({assetTxs.length})</h3>
          </div>
          {assetTxs.length === 0 ? (
            <div className="px-5 py-8 text-center text-zinc-500 text-sm">Chưa có giao dịch</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {pagedTxs.map((tx) => {
                const isBuy = tx.type === 'Buy';
                const total = tx.quantity * tx.price;

                const txPnl = isBuy ? (asset.currentPrice - tx.price) * tx.quantity : 0;
                const txPnlPercent = isBuy && tx.price !== 0 ? ((asset.currentPrice - tx.price) / tx.price) * 100 : 0;
                const isTxPnlPositive = txPnl >= 0;

                return (
                  <div key={tx.id} className="px-5 py-3 hover:bg-zinc-800/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            isBuy ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-xs text-zinc-500">{tx.date}</span>
                      </div>
                      <span className={`text-sm font-medium ${isBuy ? 'text-zinc-300' : 'text-emerald-400'}`}>
                        {isBuy ? '-' : '+'}
                        {formatMoney(total, displayCurrency, usdToVndRate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {formatQuantity(tx.quantity)} x {formatMoney(tx.price, displayCurrency, usdToVndRate)}
                      </span>
                      {tx.note && <span className="text-zinc-500 truncate ml-2 max-w-[150px]">{tx.note}</span>}
                    </div>
                    {isBuy && asset.currentPrice > 0 && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-zinc-600">vs giá TT</span>
                        <span className={isTxPnlPositive ? 'text-emerald-400' : 'text-red-400'}>
                          {isTxPnlPositive ? '+' : ''}
                          {formatMoney(txPnl, displayCurrency, usdToVndRate)}
                          <span className={`ml-1 ${isTxPnlPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            ({formatPercent(txPnlPercent)})
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <span className="text-xs text-zinc-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
