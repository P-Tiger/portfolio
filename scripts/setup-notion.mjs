/**
 * Script tạo Notion Database với schema mới (Transaction-based) + dữ liệu mẫu.
 *
 * Cách dùng:
 *   1. Tạo Notion Integration tại https://www.notion.so/my-integrations
 *   2. Copy token vào .env.local (NOTION_TOKEN=secret_xxx)
 *   3. Tạo 1 page trống trên Notion, share cho integration
 *   4. Copy Page ID từ URL (notion.so/<PAGE_ID>)
 *   5. Chạy: PARENT_PAGE_ID=<page_id> node scripts/setup-notion.mjs
 */

import { Client } from '@notionhq/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const parentPageId = process.env.PARENT_PAGE_ID;

if (!process.env.NOTION_TOKEN || !parentPageId) {
  console.error('Thiếu biến môi trường. Chạy lệnh:\n  PARENT_PAGE_ID=<page_id> node scripts/setup-notion.mjs');
  console.error('\nĐảm bảo .env.local đã có NOTION_TOKEN=secret_xxx');
  process.exit(1);
}

const sampleTransactions = [
  // Bitcoin: 2 buy + 1 sell (DCA + partial sell)
  { name: 'Bitcoin (BTC)', date: '2024-01-15', type: 'Buy', symbol: 'bitcoin', category: 'crypto', price: 2200000000, quantity: 0.03, note: 'DCA lần 1' },
  { name: 'Bitcoin (BTC)', date: '2024-06-01', type: 'Buy', symbol: 'bitcoin', category: 'crypto', price: 2800000000, quantity: 0.04, note: 'DCA lần 2' },
  { name: 'Bitcoin (BTC)', date: '2024-09-15', type: 'Sell', symbol: 'bitcoin', category: 'crypto', price: 3000000000, quantity: 0.02, note: 'Chốt lời 1 phần' },

  // Ethereum: 1 buy
  { name: 'Ethereum (ETH)', date: '2024-03-10', type: 'Buy', symbol: 'ethereum', category: 'crypto', price: 82000000, quantity: 1.2, note: '' },

  // Gold: 1 buy
  { name: 'SJC 1 chỉ', date: '2024-02-20', type: 'Buy', symbol: '', category: 'gold', price: 9200000, quantity: 5, note: 'Vàng miếng SJC' },

  // USD: 1 buy
  { name: 'USD tiền mặt', date: '2024-01-05', type: 'Buy', symbol: '', category: 'usd', price: 24800, quantity: 2000, note: 'Giá quy đổi VND/USD' },

  // Stock VCB: 1 buy
  { name: 'VCB - Vietcombank', date: '2024-04-10', type: 'Buy', symbol: 'VCB', category: 'stock', price: 88000, quantity: 500, note: 'Cổ phiếu ngân hàng' },

  // Stock FPT: 2 buy + 1 partial sell
  { name: 'FPT Corporation', date: '2024-03-01', type: 'Buy', symbol: 'FPT', category: 'stock', price: 110000, quantity: 100, note: 'Cổ phiếu công nghệ' },
  { name: 'FPT Corporation', date: '2024-05-15', type: 'Buy', symbol: 'FPT', category: 'stock', price: 130000, quantity: 100, note: 'Mua thêm' },
  { name: 'FPT Corporation', date: '2024-08-01', type: 'Sell', symbol: 'FPT', category: 'stock', price: 145000, quantity: 50, note: 'Chốt lời 1 phần' },

  // Cash: 1 buy (nạp tiền)
  { name: 'Tiền mặt VND', date: '2024-01-01', type: 'Buy', symbol: '', category: 'cash', price: 1, quantity: 50000000, note: 'Tiền gửi ngân hàng' },
];

async function main() {
  console.log('Đang tạo Notion Database (Transaction-based)...\n');

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Portfolio Transactions' } }],
    properties: {
      Name: { title: {} },
      Date: { date: {} },
      Type: {
        select: {
          options: [
            { name: 'Buy', color: 'green' },
            { name: 'Sell', color: 'red' },
          ],
        },
      },
      Symbol: { rich_text: {} },
      Category: {
        select: {
          options: [
            { name: 'crypto', color: 'orange' },
            { name: 'gold', color: 'yellow' },
            { name: 'usd', color: 'green' },
            { name: 'stock', color: 'blue' },
            { name: 'cash', color: 'gray' },
          ],
        },
      },
      Price: { number: { format: 'number' } },
      Quantity: { number: { format: 'number' } },
      Note: { rich_text: {} },
    },
  });

  console.log('Database đã tạo thành công!');
  console.log(`  ID: ${db.id}`);
  console.log(`  URL: ${db.url}\n`);

  console.log('Đang thêm transactions mẫu...\n');

  for (const tx of sampleTransactions) {
    await notion.pages.create({
      parent: { database_id: db.id },
      properties: {
        Name: { title: [{ text: { content: tx.name } }] },
        Date: { date: { start: tx.date } },
        Type: { select: { name: tx.type } },
        Symbol: tx.symbol ? { rich_text: [{ text: { content: tx.symbol } }] } : { rich_text: [] },
        Category: { select: { name: tx.category } },
        Price: { number: tx.price },
        Quantity: { number: tx.quantity },
        Note: tx.note ? { rich_text: [{ text: { content: tx.note } }] } : { rich_text: [] },
      },
    });
    console.log(`  + [${tx.type}] ${tx.name} ${tx.symbol ? `(${tx.symbol})` : ''} x${tx.quantity} @ ${tx.price}`);
  }

  console.log('\n====================================');
  console.log('SETUP HOÀN TẤT!');
  console.log('====================================');
  console.log(`\nCopy Database ID vào .env.local:`);
  console.log(`  NOTION_DATABASE_ID=${db.id}`);
  console.log(`\nSau đó chạy: npm run dev`);
}

main().catch((err) => {
  console.error('Lỗi:', err.message);
  if (err.code === 'unauthorized') {
    console.error('\n→ NOTION_TOKEN không hợp lệ. Kiểm tra lại token.');
  }
  if (err.code === 'object_not_found') {
    console.error('\n→ PARENT_PAGE_ID không hợp lệ hoặc chưa share page cho integration.');
  }
  process.exit(1);
});
