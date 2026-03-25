#!/bin/bash
set -e

SERVER="/var/www/backend/server.js"
FRONTEND="/var/www/html/isisaldo-pay.html"

echo "=== [1/4] Fix server.js — Saweria fee & qr fields ==="

# Fix qr_string, qr_image, payment_id dari Saweria
sed -i "s|const qr_string = swResult?.data?.qr_code || swResult?.qr_code || swResult?.data?.payment_url || null;|const qr_string  = swResult?.result?.data?.qr_string || null;\n        const qr_image   = swResult?.result?.data?.qr_image  || null;\n        const sw_fee     = (swResult?.result?.data?.amount_raw || 0) - (swResult?.result?.data?.etc?.amount_to_display || swResult?.result?.data?.amount_raw || 0);\n        const sw_total   = swResult?.result?.data?.amount_raw || 0;|" "$SERVER"

sed -i "s|const payment_id = swResult?.data?.payment_id || swResult?.payment_id || null;|const payment_id = swResult?.result?.data?.id || null;|" "$SERVER"

# Fix tx object Saweria — tambah fee, total_bayar, qr_image
sed -i "s|status: 'pending', metode: 'saweria',\n.*qr_string, qr_image: null,|status: 'pending', metode: 'saweria',\n          qr_string, qr_image,|" "$SERVER"

# Cara lain kalau multiline gagal — pakai python
python3 - <<'PYEOF'
import re

with open('/var/www/backend/server.js', 'r') as f:
    content = f.read()

# Fix tx object Saweria (multiline)
old = """          status: 'pending', metode: 'saweria',
          qr_string, qr_image: null,
          pakasir_ref: payment_id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),"""

new = """          status: 'pending', metode: 'saweria',
          qr_string, qr_image,
          fee: sw_fee,
          total_bayar: sw_total,
          pakasir_ref: payment_id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),"""

content = content.replace(old, new)

# Fix return response Saweria
old2 = "return res.json({ order_id, amount, qr_string, qr_image: null, expires_at: tx.expires_at });"
new2 = "return res.json({ order_id, amount, qr_string, qr_image, fee: sw_fee, total_bayar: sw_total, expires_at: tx.expires_at });"
content = content.replace(old2, new2)

with open('/var/www/backend/server.js', 'w') as f:
    f.write(content)

print("server.js patched OK")
PYEOF

echo "=== [2/4] Fix isisaldo-pay.html — tambah fee card baru ==="

python3 - <<'PYEOF'
with open('/var/www/html/isisaldo-pay.html', 'r') as f:
    content = f.read()

# ── Tambah CSS fee card baru ──────────────────────────────────────────────────
new_css = """
        /* ── Fee Detail Card (di bawah QRIS) ── */
        .fee-detail-card {
            background: rgba(13,15,25,0.92);
            border: 1px solid rgba(0,229,255,0.18);
            border-radius: 18px;
            padding: 20px 20px 16px;
            margin-bottom: 16px;
            position: relative;
            overflow: hidden;
        }
        .fee-detail-card::before {
            content:''; position:absolute; top:0; left:0; right:0; height:2px;
            background: linear-gradient(90deg,#00e5ff,#00ff88,#bf00ff);
            background-size:200%; animation: shineBar 3s linear infinite;
        }
        .fee-detail-title {
            font-size:11px; font-weight:800; letter-spacing:1px;
            text-transform:uppercase; color:rgba(0,229,255,0.6);
            margin-bottom:14px; display:flex; align-items:center; gap:7px;
        }
        .fee-table { width:100%; border-collapse:collapse; }
        .fee-table td {
            padding: 8px 0; font-size:13px; font-weight:700;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .fee-table tr:last-child td { border-bottom:none; }
        .fee-table .td-label { color:rgba(255,255,255,0.45); }
        .fee-table .td-val { text-align:right; color:#fff; font-family:'Share Tech Mono',monospace; }
        .fee-table .td-val.cyan { color:#00e5ff; }
        .fee-table .td-val.yellow { color:#ffe000; }
        .fee-table .row-total td {
            padding-top:12px; font-size:15px; font-weight:900;
        }
        .fee-table .row-total .td-label { color:#fff; }
        .fee-table .row-total .td-val {
            color:#00ff88; font-size:16px;
            filter:drop-shadow(0 0 6px rgba(0,255,136,0.5));
        }
        .fee-divider-line {
            height:1px; background:rgba(255,255,255,0.08); margin:4px 0 8px;
        }
        .fee-metode-badge {
            display:inline-flex; align-items:center; gap:5px;
            background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.2);
            border-radius:20px; padding:3px 10px;
            font-size:10px; font-weight:800; color:#00e5ff;
            letter-spacing:0.5px; text-transform:uppercase; margin-bottom:14px;
        }
"""

# Sisipkan CSS sebelum </style> pertama
content = content.replace('</style>', new_css + '\n        </style>', 1)

# ── Tambah HTML fee-detail-card setelah order-info ────────────────────────────
fee_card_html = """
        <!-- Fee Detail Card -->
        <div class="fee-detail-card" id="feeDetailCard">
            <div class="fee-detail-title">
                <i class="fas fa-receipt"></i> Rincian Pembayaran
            </div>
            <div class="fee-metode-badge" id="feeMetodeBadge">
                <i class="fas fa-qrcode"></i> <span id="feeMetodeText">QRIS</span>
            </div>
            <table class="fee-table">
                <tr>
                    <td class="td-label">Jumlah Top Up</td>
                    <td class="td-val cyan" id="feeRowAmount">-</td>
                </tr>
                <tr>
                    <td class="td-label">Biaya Layanan <span id="feePctLabel" style="font-size:10px;opacity:0.6"></span></td>
                    <td class="td-val yellow" id="feeRowFee">-</td>
                </tr>
                <tr>
                    <td colspan="2"><div class="fee-divider-line"></div></td>
                </tr>
                <tr class="row-total">
                    <td class="td-label">Total yang Dibayar</td>
                    <td class="td-val" id="feeRowTotal">-</td>
                </tr>
            </table>
        </div>
"""

# Sisipkan setelah div order-info (cari marker yang unik)
marker = '        <!-- Download -->'
content = content.replace(marker, fee_card_html + '\n' + marker, 1)

# ── Update JS loadTransaction ─────────────────────────────────────────────────
old_js = """        // Render QR dengan logo DzzXNzz di tengah
        // Tampilkan fee box
        const amount    = Number(data.amount) || 0;
        const fee       = Number(data.fee) || 0;
        const totalBayar = Number(data.total_bayar) || (amount + fee);
        document.getElementById('feeHarga').textContent  = 'Rp ' + amount.toLocaleString('id-ID');
        document.getElementById('feeFee').textContent    = 'Rp ' + fee.toLocaleString('id-ID');
        document.getElementById('feeTotal').textContent  = 'Rp ' + totalBayar.toLocaleString('id-ID');"""

new_js = """        // Render QR
        const amount     = Number(data.amount) || 0;
        const fee        = Number(data.fee) || 0;
        const totalBayar = Number(data.total_bayar) || (amount + fee);
        const metode     = data.metode || data.payment_method || 'pakasir';

        // Hitung fee pct untuk label
        const feePct = amount > 0 ? ((fee / amount) * 100).toFixed(2) : '0';

        // Isi fee detail card
        document.getElementById('feeRowAmount').textContent = 'Rp ' + amount.toLocaleString('id-ID');
        document.getElementById('feeRowFee').textContent    = fee > 0 ? 'Rp ' + fee.toLocaleString('id-ID') : 'Gratis';
        document.getElementById('feeRowTotal').textContent  = 'Rp ' + totalBayar.toLocaleString('id-ID');
        document.getElementById('feePctLabel').textContent  = fee > 0 ? '(' + feePct + '%)' : '';

        // Badge metode
        const metodeLabel = { pakasir: 'QRIS · Pakasir', saweria: 'QRIS · Saweria' };
        document.getElementById('feeMetodeText').textContent = metodeLabel[metode] || 'QRIS';

        // Kalau fee 0 sembunyikan baris fee
        if(fee === 0) {
            document.getElementById('feeRowFee').closest('tr').style.display = 'none';
            document.getElementById('feePctLabel').closest('tr').style.display = 'none';
        }"""

content = content.replace(old_js, new_js)

with open('/var/www/html/isisaldo-pay.html', 'w') as f:
    f.write(content)

print("isisaldo-pay.html patched OK")
PYEOF

echo "=== [3/4] Tambah field metode di GET /api/transaction response ==="

python3 - <<'PYEOF'
with open('/var/www/backend/server.js', 'r') as f:
    content = f.read()

# Tambah metode di select query transaction
old = "`/transactions?order_id=eq.${req.params.order_id}&select=order_id,amount,status,qr_string,qr_image,created_at,expires_at,paid_at,payment_method`"
new = "`/transactions?order_id=eq.${req.params.order_id}&select=order_id,amount,status,qr_string,qr_image,fee,total_bayar,metode,created_at,expires_at,paid_at,payment_method`"
content = content.replace(old, new)

with open('/var/www/backend/server.js', 'w') as f:
    f.write(content)

print("GET transaction query patched OK")
PYEOF

echo "=== [4/4] Restart backend ==="
pm2 restart dzzxnzz

echo ""
echo "✅ Semua selesai! Coba topup lagi dan fee card akan muncul di bawah QR."
