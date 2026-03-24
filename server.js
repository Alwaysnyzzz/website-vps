// server.js — Backend DzzXNzz
const express = require('express');
const https   = require('https');
const app     = express();

const { CONFIG } = require('/var/www/html/config.js');

app.use(express.json());
app.use(require('cors')({ origin: '*' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── SUPABASE HELPER pakai https bawaan Node (tanpa node-fetch) ────────────────
function sbRequest(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const key = opts.useService ? CONFIG.SUPABASE_SERVICE : CONFIG.SUPABASE_ANON;
    const url = new URL(CONFIG.SUPABASE_URL + '/rest/v1' + path);
    const body = opts.body ? opts.body : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': opts.prefer || 'return=representation',
      }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ ok: res.statusCode < 300, status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sb(path, opts = {}) {
  return sbRequest(path, opts);
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
async function verifyToken(token) {
  try {
    const decoded  = Buffer.from(token, 'base64').toString('utf8');
    const [username] = decoded.split(':');
    console.log('[AUTH] username:', username);
    if (!username) return null;
    const { ok, data } = await sb(`/profiles?username=eq.${username}&select=id,username,coins`);
    console.log('[AUTH] ok:', ok, 'data:', JSON.stringify(data));
    if (!ok || !data?.length) return null;
    return data[0];
  } catch(e) {
    console.log('[AUTH] error:', e.message);
    return null;
  }
}

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const user = await verifyToken(header.replace('Bearer ', ''));
  if (!user) return res.status(401).json({ error: 'Token tidak valid' });
  req.user = user;
  next();
}

function genOrderId() {
  return `DZZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
}

// ── POST /api/create-transaction ─────────────────────────────────────────────
app.post('/api/create-transaction', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user;

    if (!amount || isNaN(amount) || amount < CONFIG.MIN_TOPUP)
      return res.status(400).json({ error: `Minimal top up Rp ${CONFIG.MIN_TOPUP}` });
    if (amount > 10000000)
      return res.status(400).json({ error: 'Maksimal top up Rp 10.000.000' });

    const order_id = genOrderId();
    const metode = req.body.metode || 'pakasir';

    // Buat transaksi ke Saweria jika dipilih
    if (metode === 'saweria') {
      try {
        const swBody = JSON.stringify({
          user_id: CONFIG.SAWERIA_USER_ID,
          amount:  String(amount),
          name:    user.username,
          email:   'noreply@nyzz.my.id',
          msg:     'Topup DzzXNzz - ' + user.username,
        });
        const swUrl = new URL(CONFIG.MAELYN_BASE + '/saweria/create/payment');
        const swResult = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('timeout')), 10000);
          const r = https.request({
            hostname: swUrl.hostname, path: swUrl.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'mg-apikey': CONFIG.MAELYN_API_KEY, 'Content-Length': Buffer.byteLength(swBody) }
          }, (res) => {
            let d = ''; res.setEncoding('utf8');
            res.on('data', chunk => d += chunk);
            res.on('end', () => { clearTimeout(timer); try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
          });
          r.on('error', e => { clearTimeout(timer); reject(e); });
          r.write(swBody); r.end();
        });

        console.log('[SAWERIA]', JSON.stringify(swResult));

        const qr_string = swResult?.data?.qr_code || swResult?.qr_code || swResult?.data?.payment_url || null;
        const payment_id = swResult?.data?.payment_id || swResult?.payment_id || null;

        const tx = {
          order_id, user_id: user.id, username: user.username, amount,
          status: 'pending', metode: 'saweria',
          qr_string, qr_image: null,
          pakasir_ref: payment_id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
        await sb('/transactions', { method: 'POST', body: JSON.stringify(tx), useService: true });
        console.log('[TX SAWERIA] ' + order_id + ' | ' + user.username + ' | Rp ' + amount);
        return res.json({ order_id, amount, qr_string, qr_image: null, expires_at: tx.expires_at });
      } catch(err) {
        console.error('[SAWERIA ERROR]', err.message);
        return res.status(502).json({ error: 'Gagal buat transaksi Saweria: ' + err.message });
      }
    }

    // Buat transaksi ke Pakasir
    const pkUrl  = new URL(CONFIG.PAKASIR_ENDPOINT);
    const pkBody = JSON.stringify({
      project:  CONFIG.PAKASIR_PROJECT,
      order_id,
      amount,
      api_key:  CONFIG.PAKASIR_API_KEY,
    });

    const pkResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: pkUrl.hostname,
        path: pkUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(pkBody),
        }
      };
      const r = https.request(options, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve({ ok: res.statusCode < 300, data: JSON.parse(d) }); }
          catch { resolve({ ok: false, data: d }); }
        });
      });
      r.on('error', reject);
      r.write(pkBody);
      r.end();
    });

    console.log('[PAKASIR] ok:', pkResult.ok, 'data:', JSON.stringify(pkResult.data));

    if (!pkResult.ok) {
      return res.status(502).json({ error: 'Gagal buat transaksi QRIS', detail: pkResult.data });
    }

    const pkData = pkResult.data?.payment || pkResult.data || {};
    // Pakasir bisa kirim QR di berbagai field
    const qr_string = pkData.payment_number || pkData.qr_string || pkData.qr_code || pkData.data?.qr_string || null;
    const qr_image  = pkData.qr_image  || pkData.data?.qr_image  || null;
    console.log('[QR] qr_string:', qr_string?.substring(0,50), 'qr_image:', qr_image?.substring(0,50));

    const tx = {
      order_id, user_id: user.id, username: user.username, amount,
      status: 'pending',
      qr_string,
      qr_image,
      pakasir_ref: pkData.ref || pkData.order_id || null,
      created_at:  new Date().toISOString(),
      expires_at:  new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    await sb('/transactions', { method: 'POST', body: JSON.stringify(tx), useService: true });
    console.log(`[TX] ${order_id} | ${user.username} | Rp ${amount}`);

    res.json({ order_id, amount, qr_string: tx.qr_string, qr_image: tx.qr_image, expires_at: tx.expires_at });

  } catch (err) {
    console.error('[ERROR] create-transaction:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/transaction/:order_id ───────────────────────────────────────────
app.get('/api/transaction/:order_id', auth, async (req, res) => {
  try {
    const { ok, data } = await sb(
      `/transactions?order_id=eq.${req.params.order_id}&select=order_id,amount,status,qr_string,qr_image,created_at,expires_at,paid_at,payment_method`, { useService: true }
    );
    if (!ok || !data?.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/transaction/:order_id/status ────────────────────────────────────
app.get('/api/transaction/:order_id/status', auth, async (req, res) => {
  try {
    const { ok, data } = await sb(
      `/transactions?order_id=eq.${req.params.order_id}&user_id=eq.${req.user.id}&select=status,amount`, { useService: true }
    );
    if (!ok || !data?.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const tx = data[0];

    if (tx.status === 'pending') {
      try {
        const pkUrl = new URL(`${CONFIG.PAKASIR_STATUS}/${req.params.order_id}`);
        const detailUrl = new URL(`${CONFIG.PAKASIR_STATUS}?project=${CONFIG.PAKASIR_PROJECT}&amount=${tx.amount}&order_id=${req.params.order_id}&api_key=${CONFIG.PAKASIR_API_KEY}`);
        const ckResult = await new Promise((resolve, reject) => {
          const r = https.get({
            hostname: detailUrl.hostname,
            path: detailUrl.pathname + detailUrl.search,
            headers: {}
          }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
          });
          r.on('error', reject); r.end();
        });
        const st = ckResult.status || ckResult.data?.status || ckResult.transaction?.status;
        if (st === 'paid' || st === 'success' || st === 'completed') {
          await processPayment(req.params.order_id, req.user.id, tx.amount);
          return res.json({ status: 'paid', amount: tx.amount });
        }
      } catch(e) {}
    }
    res.json({ status: tx.status, amount: tx.amount });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/transaction/:order_id/cancel ───────────────────────────────────
app.post('/api/transaction/:order_id/cancel', auth, async (req, res) => {
  try {
    const { ok, data } = await sb(
      `/transactions?order_id=eq.${req.params.order_id}&user_id=eq.${req.user.id}&select=order_id,status`, { useService: true }
    );
    if (!ok || !data?.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    if (data[0].status !== 'pending') return res.status(400).json({ error: 'Tidak bisa dibatalkan' });
    await sb(`/transactions?order_id=eq.${req.params.order_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled', cancelled_at: new Date().toISOString() }),
      useService: true,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/webhook/pakasir ─────────────────────────────────────────────────
app.post('/api/webhook/pakasir', async (req, res) => {
  try {
    console.log('[WEBHOOK]', JSON.stringify(req.body));
    // Pakasir webhook tidak pakai secret header
    // Body: { amount, order_id, project, status, payment_method, completed_at }
    const order_id = req.body.order_id || req.body.data?.order_id;
    const status   = req.body.status   || req.body.data?.status;

    console.log('[WEBHOOK] order_id:', order_id, 'status:', status);
    if (!order_id) return res.status(400).json({ error: 'Missing order_id' });

    if (status === 'paid' || status === 'success' || status === 'completed') {
      const { ok, data } = await sb(`/transactions?order_id=eq.${order_id}&select=order_id,user_id,amount,status`);
      if (!ok || !data?.length) return res.status(404).json({ error: 'Not found' });
      const tx = data[0];
      if (tx.status === 'paid') return res.json({ ok: true, message: 'Already processed' });
      await processPayment(order_id, tx.user_id, tx.amount);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── processPayment ────────────────────────────────────────────────────────────
async function processPayment(order_id, user_id, amount) {
  await sb(`/transactions?order_id=eq.${order_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
    useService: true,
  });
  const { data } = await sb(`/profiles?id=eq.${user_id}&select=id,coins`);
  if (!data?.length) return;
  const newCoins = (Number(data[0].coins) || 0) + Number(amount);
  await sb(`/profiles?id=eq.${user_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ coins: newCoins }),
    useService: true,
  });
  console.log(`[COINS] +${amount} → total ${newCoins}`);
}

// ── GET /api/transactions ─────────────────────────────────────────────────────
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const { data } = await sb(
      `/transactions?user_id=eq.${req.user.id}&select=order_id,amount,status,created_at,paid_at&order=created_at.desc&limit=20`
    );
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(CONFIG.PORT, () => {
  console.log(`\n🚀 DzzXNzz Backend jalan di port ${CONFIG.PORT}`);
  console.log(`   Health : http://localhost:${CONFIG.PORT}/api/health`);
  console.log(`   Webhook: http://IP_VPS/api/webhook/pakasir\n`);
});
