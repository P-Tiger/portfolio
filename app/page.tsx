import { ClientDashboard } from '@/components/ClientDashboard';
import { getPortfolioData } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getPortfolioData();

  return (
    <main className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio Dashboard</h1>
      </div>

      <ClientDashboard initialData={data} />

      <footer className="mt-12 pb-8 text-center text-xs text-zinc-600">
        Dữ liệu từ Notion &middot; Giá realtime từ Binance, CafeF &middot; Cập nhật mỗi 5 giây
      </footer>
    </main>
  );
}
