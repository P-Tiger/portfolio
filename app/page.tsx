import { getPortfolioData } from '@/lib/notion';
import { Dashboard } from '@/components/Dashboard';
import { PortfolioData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function Home() {
  let data: PortfolioData | null = null;
  let error: string | null = null;

  try {
    data = await getPortfolioData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Không thể kết nối Notion';
  }

  if (error || !data) {
    return (
      <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto flex items-center justify-center">
        <div className="animate-fade-in bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Portfolio Dashboard</h1>
          <p className="text-red-400 text-sm mb-4">Lỗi kết nối Notion API</p>
          <p className="text-zinc-500 text-xs">{error}</p>
          <p className="text-zinc-600 text-xs mt-4">
            Kiểm tra NOTION_TOKEN và NOTION_DATABASE_ID trong .env.local
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio Dashboard</h1>
        <p className="text-zinc-500 text-xs hidden sm:block">
          Cập nhật: {data.lastUpdated}
        </p>
      </div>

      <Dashboard data={data} />

      <footer className="mt-12 pb-8 text-center text-xs text-zinc-600">
        Dữ liệu từ Notion &middot; Giá realtime từ CoinGecko, CafeF, fawazahmed0 &middot; Cập nhật mỗi 5 phút
      </footer>
    </main>
  );
}
