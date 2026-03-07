'use client';

import { DisplayCurrency } from '@/lib/format';
import { PortfolioData, TransactionRaw } from '@/lib/types';
import dynamic from 'next/dynamic';
import { AssetTable } from './AssetTable';
import { CategoryCards } from './CategoryCards';
import { MarketSentiment } from './MarketSentiment';
import { PortfolioSummary } from './PortfolioSummary';

const AllocationChart = dynamic(() => import('./AllocationChart').then((m) => ({ default: m.AllocationChart })), {
  ssr: false,
  loading: () => <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[380px]" />,
});
const PnlBarChart = dynamic(() => import('./PnlBarChart').then((m) => ({ default: m.PnlBarChart })), {
  ssr: false,
  loading: () => <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[380px]" />,
});
const PerformanceChart = dynamic(() => import('./PerformanceChart').then((m) => ({ default: m.PerformanceChart })), {
  ssr: false,
  loading: () => <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[380px]" />,
});

export function OverviewTab({
  data,
  transactions,
  displayCurrency,
  usdToVndRate,
}: {
  data: PortfolioData;
  transactions: TransactionRaw[];
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  return (
    <div className="tab-content space-y-6">
      <PortfolioSummary data={data} displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />
      <MarketSentiment />
      <CategoryCards data={data.categoryBreakdown} displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />
      <PerformanceChart title="Biểu đồ tài sản" displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart data={data.categoryBreakdown} displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />
        <PnlBarChart assets={data.assets} displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />
      </div>
      <AssetTable
        assets={data.assets}
        showCategory={true}
        transactions={transactions}
        displayCurrency={displayCurrency}
        usdToVndRate={usdToVndRate}
      />
    </div>
  );
}
