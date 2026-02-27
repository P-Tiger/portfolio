/**
 * Script tạo Notion Database với schema mới + dữ liệu mẫu.
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

const sampleAssets = [
  {
    name: 'Bitcoin (BTC)',
    category: 'crypto',
    quantity: 0.05,
    buyPrice: 2500000000,
    symbol: 'bitcoin',
    note: 'Hold dài hạn',
  },
  { name: 'Ethereum (ETH)', category: 'crypto', quantity: 1.2, buyPrice: 82000000, symbol: 'ethereum', note: '' },
  { name: 'SJC 1 chỉ', category: 'gold', quantity: 5, buyPrice: 9200000, symbol: '', note: 'Vàng miếng SJC' },
  { name: 'USD tiền mặt', category: 'usd', quantity: 2000, buyPrice: 24800, symbol: '', note: 'Giá quy đổi VND/USD' },
  {
    name: 'VCB - Vietcombank',
    category: 'stock',
    quantity: 500,
    buyPrice: 88000,
    symbol: 'VCB',
    note: 'Cổ phiếu ngân hàng',
  },
  {
    name: 'FPT Corporation',
    category: 'stock',
    quantity: 200,
    buyPrice: 120000,
    symbol: 'FPT',
    note: 'Cổ phiếu công nghệ',
  },
  { name: 'Tiền mặt VND', category: 'cash', quantity: 50000000, buyPrice: 1, symbol: '', note: 'Tiền gửi ngân hàng' },
];

async function main() {
  console.log('Đang tạo Notion Database...\n');

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Portfolio Assets' } }],
    properties: {
      Name: { title: {} },
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
      Quantity: { number: { format: 'number' } },
      'Buy Price': { number: { format: 'number' } },
      Symbol: { rich_text: {} },
      Note: { rich_text: {} },
    },
  });

  console.log('Database đã tạo thành công!');
  console.log(`  ID: ${db.id}`);
  console.log(`  URL: ${db.url}\n`);

  console.log('Đang thêm dữ liệu mẫu...\n');

  for (const asset of sampleAssets) {
    await notion.pages.create({
      parent: { database_id: db.id },
      properties: {
        Name: { title: [{ text: { content: asset.name } }] },
        Category: { select: { name: asset.category } },
        Quantity: { number: asset.quantity },
        'Buy Price': { number: asset.buyPrice },
        Symbol: asset.symbol ? { rich_text: [{ text: { content: asset.symbol } }] } : { rich_text: [] },
        Note: asset.note ? { rich_text: [{ text: { content: asset.note } }] } : { rich_text: [] },
      },
    });
    console.log(`  + ${asset.name} ${asset.symbol ? `(${asset.symbol})` : ''}`);
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
