# 🚀 Setup Guide — DzzXNzz Backend + Topup Pakasir

## Struktur File

```
/var/www/html/          ← File frontend (Nginx serve)
├── isisaldo.html       ← Halaman form isi saldo (baru)
├── isisaldo-pay.html   ← Halaman bayar QRIS
├── index.html
├── login.html
├── register.html
├── style.css
├── style-extra.css
├── config.js
├── auth.js
└── script.js

/var/www/backend/       ← Backend Node.js
├── server.js
├── package.json
└── .env
```

---

## Langkah 1 — Supabase Migration

Buka **Supabase > SQL Editor**, jalankan isi file `supabase-migration.sql`.

Lalu ambil **Service Role Key**:
- Supabase > Settings > API > `service_role` (secret)
- Simpan untuk langkah 3

---

## Langkah 2 — Upload File Frontend ke VPS

```bash
# Upload semua file frontend ke /var/www/html/
scp isisaldo.html isisaldo-pay.html user@VPS_IP:/var/www/html/

# Update nginx config
scp nginx.conf user@VPS_IP:/etc/nginx/sites-available/default
nginx -t && systemctl reload nginx
```

---

## Langkah 3 — Setup Backend

```bash
# Di VPS
mkdir -p /var/www/backend
cd /var/www/backend

# Upload server.js dan package.json
scp server.js package.json user@VPS_IP:/var/www/backend/

# Install dependencies
npm install

# Buat file .env
nano .env
```

Isi `.env`:
```
PORT=3000
SUPABASE_URL=https://besavhrntlravtegavtk.supabase.co
SUPABASE_ANON=<anon key>
SUPABASE_SERVICE=<service role key>  ← WAJIB DIISI
PAKASIR_PROJECT=toko-digital
PAKASIR_API_KEY=bFbp3ZZsqOEiXsxZ9nd69CZMWdZHXSNP
WEBHOOK_SECRET=dzzxnzz-webhook-secret-2026
```

---

## Langkah 4 — Jalankan dengan PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Jalankan backend
cd /var/www/backend
pm2 start server.js --name dzzxnzz-backend

# Auto-start saat reboot
pm2 startup
pm2 save
```

---

## Langkah 5 — Setup Webhook di Pakasir

1. Login ke **app.pakasir.com**
2. Buka **Settings > Webhook**
3. Set URL webhook:
   ```
   http://YOUR_VPS_IP/api/webhook/pakasir
   ```
4. Set secret header:
   ```
   Key: x-webhook-secret
   Value: dzzxnzz-webhook-secret-2026
   ```

---

## Langkah 6 — Test

```bash
# Cek backend jalan
curl http://localhost:3000/api/health

# Cek nginx proxy
curl http://YOUR_VPS_IP/api/health
```

---

## Alur Topup

```
User pilih nominal
    ↓
POST /api/create-transaction
    ↓
Backend buat transaksi di Pakasir
    ↓
Backend simpan ke Supabase (status: pending)
    ↓
Frontend redirect ke /isisaldo/ORDER_ID
    ↓
Halaman isisaldo-pay.html tampilkan QRIS
    ↓
User scan & bayar
    ↓
Pakasir kirim webhook ke /api/webhook/pakasir
    ↓
Backend update status → paid
Backend tambah coins ke user di Supabase
    ↓
Frontend polling detect paid → tampilkan success
```

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| QRIS tidak muncul | Cek API key Pakasir di .env |
| Coins tidak bertambah | Pastikan SUPABASE_SERVICE diisi |
| Webhook tidak masuk | Cek URL webhook di Pakasir, pastikan nginx jalan |
| 502 Bad Gateway | Pastikan `pm2 start server.js` sudah jalan |
