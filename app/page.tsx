import { ClientDashboard } from '@/components/ClientDashboard';
import { PortfolioData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

// Empty initial data structure
const emptyData: PortfolioData = {
  assets: [],
  totalValue: 0,
  totalCost: 0,
  totalPnl: 0,
  totalPnlPercent: 0,
  categoryBreakdown: [],
  lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
};

export default function Home() {
  // Return immediately without waiting for Notion fetch
  // Client will fetch full data (Notion + prices) and update
  return (
    <main className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio Dashboard</h1>
        <p className="text-zinc-500 text-xs hidden sm:block">Cập nhật: {emptyData.lastUpdated}</p>
      </div>

      <ClientDashboard data={emptyData} rawAssets={[]} />

      <footer className="mt-12 pb-8 text-center text-xs text-zinc-600">
        Dữ liệu từ Notion &middot; Giá realtime từ Binance, CafeF &middot; Cập nhật mỗi 5 phút
      </footer>
    </main>
  );
}
