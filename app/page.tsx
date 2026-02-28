import dynamic from 'next/dynamic';

const ClientDashboard = dynamic(
  () => import('@/components/ClientDashboard').then(mod => ({ default: mod.ClientDashboard })),
  { ssr: false },
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
