'use client';

import { Category, PortfolioData } from '@/lib/types';
import { useState } from 'react';
import { CategoryTab } from './CategoryTab';
import { OverviewTab } from './OverviewTab';
import { TabKey, TabNavigation } from './TabNavigation';

interface Props {
  data: PortfolioData;
  refreshIntervalSec: number;
  onRefreshIntervalChange: (seconds: number) => void;
}

export function Dashboard({ data, refreshIntervalSec, onRefreshIntervalChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const categoryCounts: Record<string, number> = {};
  for (const bd of data.categoryBreakdown) {
    categoryCounts[bd.category] = bd.count;
  }

  const filteredAssets = activeTab === 'overview' ? data.assets : data.assets.filter((a) => a.category === activeTab);

  return (
    <>
      <div className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-2">
        <div className="flex items-center justify-end px-2 pb-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Chu kỳ làm mới
            <select
              value={refreshIntervalSec}
              onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </label>
        </div>
        <TabNavigation active={activeTab} onChange={setActiveTab} categoryCounts={categoryCounts} />
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab data={data} />
      ) : (
        <CategoryTab key={activeTab} category={activeTab as Category} assets={filteredAssets} />
      )}
    </>
  );
}
