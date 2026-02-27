'use client';

import { useState } from 'react';
import { Category, PortfolioData } from '@/lib/types';
import { TabNavigation, TabKey } from './TabNavigation';
import { OverviewTab } from './OverviewTab';
import { CategoryTab } from './CategoryTab';

export function Dashboard({ data }: { data: PortfolioData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const categoryCounts: Record<string, number> = {};
  for (const bd of data.categoryBreakdown) {
    categoryCounts[bd.category] = bd.count;
  }

  const filteredAssets = activeTab === 'overview' ? data.assets : data.assets.filter((a) => a.category === activeTab);

  return (
    <>
      <div className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-2">
        <TabNavigation active={activeTab} onChange={setActiveTab} categoryCounts={categoryCounts} />
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab data={data} />
      ) : (
        <CategoryTab
          key={activeTab}
          category={activeTab as Category}
          assets={filteredAssets}
        />
      )}
    </>
  );
}
