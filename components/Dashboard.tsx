'use client';

import { DisplayCurrency } from '@/lib/format';
import { Category, PortfolioData } from '@/lib/types';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { CategoryTab } from './CategoryTab';
import { OverviewTab } from './OverviewTab';
import { TabKey, TabNavigation } from './TabNavigation';
import { ThemeSwitcher } from './ThemeSwitcher';

interface Props {
  data: PortfolioData;
  refreshIntervalSec: number;
  onRefreshIntervalChange: (seconds: number) => void;
}

export function Dashboard({ data, refreshIntervalSec, onRefreshIntervalChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('VND');
  const [, startTabTransition] = useTransition();

  const handleTabChange = useCallback((tab: TabKey) => {
    startTabTransition(() => setActiveTab(tab));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('portfolio-display-currency');
    if (saved === 'VND' || saved === 'USD') {
      setDisplayCurrency(saved);
    }
  }, []);

  const handleCurrencyChange = (currency: DisplayCurrency) => {
    setDisplayCurrency(currency);
    localStorage.setItem('portfolio-display-currency', currency);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bd of data.categoryBreakdown) {
      counts[bd.category] = bd.count;
    }
    return counts;
  }, [data.categoryBreakdown]);

  const filteredAssets = useMemo(
    () => (activeTab === 'overview' ? data.assets : data.assets.filter((a) => a.category === activeTab)),
    [activeTab, data.assets],
  );
  const transactions = data.transactions || [];

  return (
    <>
      <div className="mb-6 flex items-center justify-end gap-3">
        <ThemeSwitcher />
        <div className="theme-switcher flex items-center">
          <button
            onClick={() => handleCurrencyChange('VND')}
            className={`px-2.5 py-1 text-xs rounded transition-all ${
              displayCurrency === 'VND' ? 'theme-btn-active' : 'theme-btn-inactive'
            }`}
          >
            VND
          </button>
          <button
            onClick={() => handleCurrencyChange('USD')}
            className={`px-2.5 py-1 text-xs rounded transition-all ${
              displayCurrency === 'USD' ? 'theme-btn-active' : 'theme-btn-inactive'
            }`}
          >
            USD
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs theme-text-secondary">
          Chu kỳ làm mới
          <select
            value={refreshIntervalSec}
            onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
            className="theme-bg-secondary theme-border border rounded-md px-2 py-1 text-xs theme-text-primary"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
        </label>
      </div>
      <div className="mb-6 theme-bg-card theme-border border rounded-xl p-2">
        <TabNavigation active={activeTab} onChange={handleTabChange} categoryCounts={categoryCounts} />
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab
          data={data}
          transactions={transactions}
          displayCurrency={displayCurrency}
          usdToVndRate={data.usdToVndRate}
        />
      ) : (
        <CategoryTab
          key={activeTab}
          category={activeTab as Category}
          assets={filteredAssets}
          transactions={transactions}
          displayCurrency={displayCurrency}
          usdToVndRate={data.usdToVndRate}
        />
      )}
    </>
  );
}
