'use client';

import { ALL_CATEGORIES, Category, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';
import { memo } from 'react';

export type TabKey = 'overview' | Category;

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: 'overview', label: 'Tổng hợp', color: '#a78bfa' },
  ...ALL_CATEGORIES.map((cat) => ({
    key: cat as TabKey,
    label: CATEGORY_LABELS[cat],
    color: CATEGORY_COLORS[cat],
  })),
];

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  categoryCounts: Record<string, number>;
}

export const TabNavigation = memo(function TabNavigation({ active, onChange, categoryCounts }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const count = tab.key === 'overview' ? undefined : categoryCounts[tab.key];
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
              ${isActive ? 'theme-text-primary shadow-lg' : 'theme-text-secondary active:theme-text-primary'}
            `}
            style={
              isActive
                ? {
                    backgroundColor: `${tab.color}20`,
                    boxShadow: `0 0 20px ${tab.color}15`,
                  }
                : undefined
            }
          >
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ backgroundColor: tab.color }}
              />
            )}
            {tab.label}
            {count !== undefined && count > 0 && (
              <span className={`ml-1.5 text-xs ${isActive ? 'theme-text-secondary' : 'theme-text-muted'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
