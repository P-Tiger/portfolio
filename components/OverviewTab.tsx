'use client';

import { PortfolioData, TransactionRaw } from '@/lib/types';
import { AllocationChart } from './AllocationChart';
import { AssetTable } from './AssetTable';
import { CategoryCards } from './CategoryCards';
import { PnlBarChart } from './PnlBarChart';
import { PortfolioSummary } from './PortfolioSummary';

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
