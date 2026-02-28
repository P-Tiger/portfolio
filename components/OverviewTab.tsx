'use client';

import { PortfolioData, TransactionRaw } from '@/lib/types';
import dynamic from 'next/dynamic';
import { AssetTable } from './AssetTable';
import { CategoryCards } from './CategoryCards';
import { PortfolioSummary } from './PortfolioSummary';

const AllocationChart = dynamic(
  () => import('./AllocationChart').then((m) => ({ default: m.AllocationChart })),
  { ssr: false, loading: () => <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[380px]" /> }
);
const PnlBarChart = dynamic(
  () => import('./PnlBarChart').then((m) => ({ default: m.PnlBarChart })),
  { ssr: false, loading: () => <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[380px]" /> }
);

export function OverviewTab({ data, transactions }: { data: PortfolioData; transactions: TransactionRaw[] }) {
  return (
    <div className="tab-content space-y-6">
      <PortfolioSummary data={data} />
      <CategoryCards data={data.categoryBreakdown} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart data={data.categoryBreakdown} />
        <PnlBarChart assets={data.assets} />
      </div>
      <AssetTable assets={data.assets.slice(0, 10)} showCategory={true} transactions={transactions} />
    </div>
  );
}
