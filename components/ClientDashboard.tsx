'use client';

import { useEffect, useState } from 'react';
import { Dashboard } from './Dashboard';
import { AssetRaw, Category, CategoryBreakdown, CATEGORY_COLORS, CATEGORY_LABELS, PortfolioData, PriceInfo, PriceMap } from '@/lib/types';

interface ClientDashboardProps {
  data: PortfolioData;
  rawAssets: AssetRaw[];
}

function resolvePrice(raw: AssetRaw, prices: PriceMap): {
  currentPrice: number;
  change24h: number;
} {
  let currentPrice = 0;
  let change24h = 0;

  switch (raw.category) {
    case 'crypto': {
      const p = prices[raw.symbol.toLowerCase()];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'stock': {
      const key = raw.symbol.toUpperCase();
      const p = prices[key];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'gold': {
      const p = prices['__gold__'];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'usd': {
      const p = prices['__usd__'];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'cash': {
      currentPrice = 1;
      break;
    }
  }

  return { currentPrice, change24h };
}

function recalculatePortfolioData(rawAssets: AssetRaw[], prices: PriceMap): PortfolioData {
  const assets = rawAssets.map((raw) => {
    const { currentPrice, change24h } = resolvePrice(raw, prices);
    const totalValue = raw.quantity * currentPrice;
    const totalCost = raw.quantity * raw.buyPrice;
    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    return {
      ...raw,
      currentPrice,
      change24h,
      totalValue,
      totalCost,
      pnl,
      pnlPercent,
    };
  });

  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCost = assets.reduce((sum, a) => sum + a.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const catMap = new Map<Category, { value: number; cost: number; count: number }>();
  for (const asset of assets) {
    const existing = catMap.get(asset.category) ?? { value: 0, cost: 0, count: 0 };
    existing.value += asset.totalValue;
    existing.cost += asset.totalCost;
    existing.count += 1;
    catMap.set(asset.category, existing);
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([cat, d]) => {
      const pnl = d.value - d.cost;
      return {
        category: cat,
        name: CATEGORY_LABELS[cat] || cat,
        value: d.value,
        cost: d.cost,
        pnl,
        pnlPercent: d.cost > 0 ? (pnl / d.cost) * 100 : 0,
        percent: totalValue > 0 ? (d.value / totalValue) * 100 : 0,
        color: CATEGORY_COLORS[cat] || '#6b7280',
        count: d.count,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    assets: assets.sort((a, b) => b.totalValue - a.totalValue),
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    categoryBreakdown,
    lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
}

function loadPricesFromStorage(): PriceMap {
  try {
    const stored = localStorage.getItem('portfolio-prices');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePricesToStorage(prices: PriceMap) {
  try {
    localStorage.setItem('portfolio-prices', JSON.stringify(prices));
  } catch {
    // Silently fail if localStorage unavailable
  }
}

export function ClientDashboard({ data, rawAssets }: ClientDashboardProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(data);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Load prices from localStorage after hydration
    const storedPrices = loadPricesFromStorage();
    if (Object.keys(storedPrices).length > 0) {
      const dataWithStoredPrices = recalculatePortfolioData(rawAssets, storedPrices);
      setPortfolioData(dataWithStoredPrices);
    }
    setHydrated(true);
  }, [rawAssets]);

  useEffect(() => {
    // Only start fetching after hydration is complete
    if (!hydrated) return;

    // Fetch prices immediately and silently (no loading state)
    const fetchPrices = async () => {
      try {
        console.log('[dashboard] Fetching fresh prices...');
        const response = await fetch('/api/refresh-prices');
        if (!response.ok) {
          console.error('[dashboard] Failed to fetch prices:', response.statusText);
          return;
        }
        const prices: PriceMap = await response.json();
        console.log('[dashboard] Fresh prices received, updating dashboard');

        // Save to localStorage for next load
        savePricesToStorage(prices);

        const newData = recalculatePortfolioData(rawAssets, prices);
        setPortfolioData(newData);
      } catch (e) {
        console.error('[dashboard] Error refreshing prices:', (e as Error).message);
        // Silently fail - keep showing old data
      }
    };

    // Fetch immediately
    fetchPrices();

    // Then refresh every 5 seconds
    const interval = setInterval(fetchPrices, 5000);

    return () => clearInterval(interval);
  }, [hydrated, rawAssets]);

  // Show dashboard - all Notion data visible immediately
  return <Dashboard data={portfolioData} />;
}
