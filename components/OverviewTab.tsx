'use client';

import { PortfolioData } from '@/lib/types';
import { PortfolioSummary } from './PortfolioSummary';
import { CategoryCards } from './CategoryCards';
import { AllocationChart } from './AllocationChart';
import { PnlBarChart } from './PnlBarChart';
import { PerformanceChart } from './PerformanceChart';
import { AssetTable } from './AssetTable';

export function OverviewTab({ data }: { data: PortfolioData }) {
  return (
    <div className="tab-content space-y-6">
      <PortfolioSummary data={data} />
      <PerformanceChart title="Portfolio Performance" category="overview" />
      <CategoryCards data={data.categoryBreakdown} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart data={data.categoryBreakdown} />
        <PnlBarChart assets={data.assets} />
      </div>
      <AssetTable assets={data.assets.slice(0, 10)} />
    </div>
  );
}
