/**
 * Script tạo Notion Database cho Portfolio History (snapshot hàng ngày).
 *
 * Cách dùng:
 *   1. Đảm bảo .env.local đã có NOTION_TOKEN và PARENT_PAGE_ID
 *   2. Chạy: npm run setup-history
 *   3. Copy NOTION_HISTORY_DB_ID vào .env.local
 */

import { Client } from '@notionhq/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const parentPageId = process.env.PARENT_PAGE_ID;

if (!process.env.NOTION_TOKEN || !parentPageId) {
  console.error('Thiếu biến môi trường. Đảm bảo .env.local có NOTION_TOKEN và PARENT_PAGE_ID');
  process.exit(1);
}

async function main() {
  console.log('Đang tạo Portfolio History database...\n');

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Portfolio History' } }],
    properties: {
      Name: { title: {} },
      Date: { date: {} },
      TotalValue: { number: { format: 'number' } },
      TotalCost: { number: { format: 'number' } },
      Crypto: { number: { format: 'number' } },
      Gold: { number: { format: 'number' } },
      USD: { number: { format: 'number' } },
      Stock: { number: { format: 'number' } },
      Cash: { number: { format: 'number' } },
    },
  });

  console.log('Database đã tạo thành công!');
  console.log(`  ID: ${db.id}`);
  console.log(`  URL: ${db.url}\n`);
  console.log('Copy vào .env.local:');
  console.log(`  NOTION_HISTORY_DB_ID=${db.id}\n`);
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
