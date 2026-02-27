# Deploy Portfolio Dashboard lên Vercel

## Yêu cầu trước khi deploy

- Tài khoản [GitHub](https://github.com)
- Tài khoản [Vercel](https://vercel.com) (free, đăng nhập bằng GitHub)
- Notion Integration Token + Database ID đã setup xong

---

## Bước 1: Push code lên GitHub

```bash
# Vào thư mục project
cd ~/Desktop/portforlio

# Khởi tạo git repo
git init
git add .
git commit -m "Portfolio Dashboard v2"

# Tạo repo trên GitHub (dùng GitHub CLI hoặc tạo thủ công trên github.com)
# Cách 1: GitHub CLI
gh repo create portfolio-dashboard --private --push --source=.

# Cách 2: Thủ công
# 1. Vào github.com -> New repository -> đặt tên "portfolio-dashboard" -> Create
# 2. Chạy:
git remote add origin https://github.com/<username>/portfolio-dashboard.git
git branch -M main
git push -u origin main
```

---

## Bước 2: Import project vào Vercel

1. Vào [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Chọn repo `portfolio-dashboard` vừa push
4. Vercel tự detect Next.js, giữ nguyên settings mặc định:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build`
   - **Output Directory**: `.next`

---

## Bước 3: Cấu hình Environment Variables

Trên trang import (trước khi deploy), mở phần **Environment Variables** và thêm:

| Key                  | Value                                         |
| -------------------- | --------------------------------------------- |
| `NOTION_TOKEN`       | `secret_xxx...` (token từ Notion Integration) |
| `NOTION_DATABASE_ID` | `abc123...` (ID database từ Notion)           |

**Quan trọng**: Đảm bảo cả 2 biến đều đã điền đúng. Không có dấu ngoặc kép.

---

## Bước 4: Deploy

1. Click **Deploy**
2. Chờ khoảng 1-2 phút build
3. Sau khi xong, Vercel cho bạn URL dạng: `https://portfolio-dashboard-xxx.vercel.app`
4. Mở URL -> xem dashboard

---

## Cập nhật sau này

Mỗi lần push code lên GitHub, Vercel tự động rebuild và deploy:

```bash
git add .
git commit -m "Update something"
git push
```

---

## Custom Domain (tùy chọn)

Nếu bạn có domain riêng:

1. Vào Vercel Dashboard -> chọn project -> **Settings** -> **Domains**
2. Thêm domain, ví dụ: `portfolio.yourdomain.com`
3. Cập nhật DNS record theo hướng dẫn của Vercel:
   - **CNAME**: `portfolio` -> `cname.vercel-dns.com`
   - Hoặc **A record**: `76.76.21.21`

---

## Troubleshooting

### Build failed: "API token is invalid"

App có error handling, build sẽ không fail vì lỗi Notion. Nhưng nếu API trả về lỗi:

1. Vào Vercel Dashboard -> **Settings** -> **Environment Variables**
2. Kiểm tra `NOTION_TOKEN` và `NOTION_DATABASE_ID` đúng chưa
3. Redeploy: **Deployments** -> click **...** -> **Redeploy**

### Giá hiển thị 0

Kiểm tra trong Notion Database:

- Cột **Symbol** có đúng giá trị không?
  - Crypto: `bitcoin`, `ethereum`, `solana` (CoinGecko ID, viết thường)
  - Stock: `VCB`, `FPT` (mã chứng khoán, viết hoa)
  - Gold/USD/Cash: để trống

Xem logs: Vercel Dashboard -> **Deployments** -> chọn deployment mới nhất -> **Functions** -> xem log `[prices]`

### Muốn đổi lại deploy Docker/Oracle

Mở `next.config.mjs`, bỏ comment dòng `output: 'standalone'`:

```js
const nextConfig = {
  output: 'standalone', // Bật cho Docker
};
```

---

## Notion Database Schema (nhắc lại)

| Cột           | Kiểu   | Ví dụ                                       |
| ------------- | ------ | ------------------------------------------- |
| **Name**      | Title  | Bitcoin (BTC), SJC 1 chỉ                    |
| **Category**  | Select | `crypto`, `gold`, `usd`, `stock`, `cash`    |
| **Quantity**  | Number | 0.05, 5, 2000                               |
| **Buy Price** | Number | 2500000000, 9200000                         |
| **Symbol**    | Text   | `bitcoin`, `VCB`, (trống cho gold/usd/cash) |
| **Note**      | Text   | Ghi chú tùy ý                               |

---

## Nguồn giá realtime

| Loại        | API                               | Tần suất                 |
| ----------- | --------------------------------- | ------------------------ |
| Crypto      | CoinGecko (fallback: fawazahmed0) | Realtime / Daily         |
| Cổ phiếu VN | CafeF banggia                     | Realtime (giờ giao dịch) |
| Vàng        | fawazahmed0 XAU/VND               | Daily                    |
| USD         | open.er-api.com                   | Daily                    |
| Tiền mặt    | Không cần API                     | Giá = 1 VND              |
