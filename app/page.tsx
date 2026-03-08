'use client';

import dynamic from 'next/dynamic';

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tab navigation */}
      <div className="theme-bg-card theme-border border rounded-xl p-2 h-[52px]" />

      {/* Portfolio summary - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="theme-bg-card theme-border border rounded-xl p-4 lg:p-5 h-[88px]" />
        ))}
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="theme-bg-card theme-border border rounded-xl p-4 h-[148px]" />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="theme-bg-card theme-border border rounded-xl p-5 h-[340px]" />
        <div className="theme-bg-card theme-border border rounded-xl p-5 h-[370px]" />
      </div>

      {/* Table */}
      <div className="theme-bg-card theme-border border rounded-xl h-[400px]" />
    </div>
  );
}

const ClientDashboard = dynamic(
  () => import('@/components/ClientDashboard').then((mod) => ({ default: mod.ClientDashboard })),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 512 512" className="shrink-0" aria-hidden="true">
            <rect
              width="512"
              height="512"
              rx="108"
              className="fill-current theme-text-secondary"
              style={{ opacity: 0.3 }}
            />
            <rect x="80" y="304" width="80" height="128" rx="14" fill="#10b981" opacity="0.45" />
            <rect x="184" y="224" width="80" height="208" rx="14" fill="#10b981" opacity="0.65" />
            <rect x="288" y="152" width="80" height="280" rx="14" fill="#10b981" opacity="0.85" />
            <rect x="392" y="80" width="80" height="352" rx="14" fill="#10b981" />
          </svg>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text-primary">Portfolio Dashboard</h1>
        </div>
      </div>

      <ClientDashboard />

      <footer className="mt-12 pb-8 text-center text-xs theme-text-muted">
        Dữ liệu từ Notion &middot; Giá realtime từ Binance, CafeF &middot; Cập nhật mỗi 5 giây
      </footer>
    </main>
  );
}
