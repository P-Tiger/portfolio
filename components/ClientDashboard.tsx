'use client';

import {
  AssetRaw,
  Category,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CategoryBreakdown,
  PortfolioData,
  PriceMap,
  TransactionRaw,
} from '@/lib/types';
import { startTransition, useEffect, useRef, useState } from 'react';
import { Dashboard } from './Dashboard';

function resolvePrice(raw: AssetRaw, prices: PriceMap) {
  let currentPrice = 0;
  let change24h = 0;

  switch (raw.category) {
    case 'crypto': {
      const p = prices[raw.symbol.toLowerCase()];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'stock': {
      const p = prices[raw.symbol.toUpperCase()];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'gold': {
      const p = prices['__gold__'];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'usd': {
      const p = prices['__usd__'];
      if (p) {
        currentPrice = p.vnd;
        change24h = p.change24h;
      }
      break;
    }
    case 'cash': {
      currentPrice = 1;
      break;
    }
  }

  return { currentPrice, change24h };
}

function buildPortfolioData(rawAssets: AssetRaw[], prices: PriceMap): PortfolioData {
  const assets = rawAssets.map((raw) => {
    const { currentPrice, change24h } = resolvePrice(raw, prices);

    let totalValue: number;
    let totalCost: number;
    let pnl: number;
    let pnlPercent: number;

    if (raw.quantity <= 0) {
      totalValue = 0;
      totalCost = raw.totalCostGross;
      pnl = raw.totalProceeds - raw.totalCostGross;
      pnlPercent = raw.totalCostGross > 0 ? (pnl / raw.totalCostGross) * 100 : 0;
    } else {
      totalValue = raw.quantity * currentPrice;
      const netCost = raw.totalCostGross - raw.totalProceeds;
      totalCost = netCost;
      pnl = totalValue - netCost;
      pnlPercent = raw.totalCostGross > 0 ? (pnl / raw.totalCostGross) * 100 : 0;
    }

    return { ...raw, currentPrice, change24h, totalValue, totalCost, pnl, pnlPercent };
  });

  const totalValue = assets.reduce((s, a) => s + a.totalValue, 0);
  const totalCost = assets.reduce((s, a) => s + a.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const catMap = new Map<Category, { value: number; cost: number; count: number }>();
  for (const a of assets) {
    const e = catMap.get(a.category) ?? { value: 0, cost: 0, count: 0 };
    e.value += a.totalValue;
    e.cost += a.totalCost;
    e.count += 1;
    catMap.set(a.category, e);
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
    usdToVndRate: prices.__usd__?.vnd ?? 0,
  };
}

function loadPrices(): PriceMap {
  try {
    const s = localStorage.getItem('portfolio-prices');
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function savePrices(prices: PriceMap) {
  try {
    localStorage.setItem('portfolio-prices', JSON.stringify(prices));
  } catch {
    /* ignore */
  }
}

function saveRawAssets(assets: AssetRaw[]) {
  try {
    localStorage.setItem('portfolio-raw-assets', JSON.stringify(assets));
  } catch {
    /* ignore */
  }
}

function loadRefreshIntervalSec(): number {
  try {
    const s = localStorage.getItem('portfolio-refresh-interval-sec');
    const v = s ? Number(s) : 30;
    if (v === 15 || v === 30 || v === 60) return v;
  } catch {
    // ignore
  }
  return 30;
}

function saveRefreshIntervalSec(seconds: number) {
  try {
    localStorage.setItem('portfolio-refresh-interval-sec', String(seconds));
  } catch {
    /* ignore */
  }
}

interface ClientDashboardProps {
  initialData: PortfolioData;
}

export function ClientDashboard({ initialData }: ClientDashboardProps) {
  // Use server-fetched data for initial render (enables SSR)
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(initialData);
  const rawAssetsRef = useRef<AssetRaw[]>(initialData.rawAssets || []);
  const transactionsRef = useRef<TransactionRaw[]>(initialData.transactions || []);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(() => {
    if (typeof window === 'undefined') return 30;
    return loadRefreshIntervalSec();
  });

  // Save server data to localStorage for offline fallback
  useEffect(() => {
    if (initialData.rawAssets?.length) {
      saveRawAssets(initialData.rawAssets);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchNotion = async () => {
      try {
        const res = await fetch('/api/portfolio-data');
        if (!res.ok) return;
        const notionData: PortfolioData & { rawAssets?: AssetRaw[]; transactions?: TransactionRaw[] } =
          await res.json();
        const raw = notionData.rawAssets || [];
        rawAssetsRef.current = raw;
        transactionsRef.current = notionData.transactions || [];
        saveRawAssets(raw);

        const prices = loadPrices();
        if (Object.keys(prices).length > 0) {
          const built = buildPortfolioData(raw, prices);
          startTransition(() => {
            setPortfolioData({ ...built, transactions: transactionsRef.current });
          });
        } else {
          startTransition(() => {
            setPortfolioData({ ...notionData, transactions: transactionsRef.current });
          });
        }
      } catch (e) {
        console.error('[dashboard] Notion fetch error:', (e as Error).message);
      }
    };

    const fetchPrices = async () => {
      if (rawAssetsRef.current.length === 0) return;
      try {
        const res = await fetch(`/api/refresh-prices?cacheTtl=${refreshIntervalSec}`);
        if (!res.ok) return;
        const prices: PriceMap = await res.json();
        savePrices(prices);
        const built = buildPortfolioData(rawAssetsRef.current, prices);
        startTransition(() => {
          setPortfolioData({ ...built, transactions: transactionsRef.current });
        });
      } catch (e) {
        console.error('[dashboard] Prices fetch error:', (e as Error).message);
      }
    };

    // Server already fetched fresh data, only set up intervals for subsequent refreshes
    const notionInterval = setInterval(fetchNotion, 5 * 60 * 1000);
    const pricesInterval = setInterval(fetchPrices, refreshIntervalSec * 1000);
    return () => {
      clearInterval(notionInterval);
      clearInterval(pricesInterval);
    };
  }, [refreshIntervalSec]);

  const handleRefreshIntervalChange = (seconds: number) => {
    setRefreshIntervalSec(seconds);
    saveRefreshIntervalSec(seconds);
  };

  return (
    <Dashboard
      data={portfolioData}
      refreshIntervalSec={refreshIntervalSec}
      onRefreshIntervalChange={handleRefreshIntervalChange}
    />
  );
}
