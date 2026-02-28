import dynamic from 'next/dynamic';

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tab navigation */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 h-[52px]" />

      {/* Portfolio summary - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:p-5 h-[88px]" />
        ))}
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-[148px]" />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[340px]" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[370px]" />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-[400px]" />
    </div>
  );
}

const ClientDashboard = dynamic(
  () => import('@/components/ClientDashboard').then(mod => ({ default: mod.ClientDashboard })),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio Dashboard</h1>
      </div>

      <ClientDashboard />

      <footer className="mt-12 pb-8 text-center text-xs text-zinc-600">
        Dữ liệu từ Notion &middot; Giá realtime từ Binance, CafeF &middot; Cập nhật mỗi 5 giây
      </footer>
    </main>
  );
}
