// config.js — Konfigurasi global
// ⚠️ ISI SEMUA NILAI DI BAWAH SEBELUM PUSH KE GITHUB

const CONFIG = {

  // ── Supabase (ambil dari supabase.com > Settings > API) ──
  SUPABASE_URL:     'https://besavhrntlravtegavtk.supabase.co',
  SUPABASE_ANON:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlc2F2aHJudGxyYXZ0ZWdhdnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYyNjgsImV4cCI6MjA4OTU5MjI2OH0.pqo9P95eYhXsH5GX1DmD2n8bxPbFu2se69VPEoH_AHg',
  SUPABASE_SERVICE: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlc2F2aHJudGxyYXZ0ZWdhdnRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAxNjI2OCwiZXhwIjoyMDg5NTkyMjY4fQ.CiAZvESa7USIm9S-nW0Quz4elZ-EVQcvqc18tjzGTXc',   // jangan sampai kosong!

  // ── Pakasir (ambil dari app.pakasir.com) ─────────────────
  PAKASIR_PROJECT:  'toko-digital',
  PAKASIR_API_KEY:  'bFbp3ZZsqOEiXsxZ9nd69CZMWdZHXSNP',
  PAKASIR_ENDPOINT: 'https://app.pakasir.com/api/transactioncreate/qris',
  PAKASIR_STATUS:   'https://app.pakasir.com/api/transactionstatus',

  // ── Webhook secret (bebas, samain nanti di Pakasir) ──────
  WEBHOOK_SECRET:   'rahasia123',

  // ── Saweria (saweria.io) ──────────────────────────────────
  SAWERIA_USER_ID:  'a9c2bc37-e557-463e-98b8-c29fc37700b0',
  SAWERIA_USERNAME: 'alwaysnyzzz',

  // ── Maelyn API (maelyn.sbs) ───────────────────────────────
  MAELYN_API_KEY:   'mg-Lo81sdCx1uYPYd3LAIzzHJdygokrK98s',
  MAELYN_BASE:      'https://api.maelyn.sbs/api',

  // ── Lainnya (tidak perlu diubah) ─────────────────────────
  PORT:             3000,
  MIN_TOPUP:        1000,   // minimal top up dalam rupiah

};

// Paket topup (opsional, bisa disesuaikan)
const TOPUP_PAKET = [
  { id: 'tp1', label: '1.000 Koin',  harga: 1000,   bonus: '' },
  { id: 'tp2', label: '5.000 Koin',  harga: 5000,   bonus: '' },
  { id: 'tp3', label: '10.000 Koin', harga: 10000,  bonus: '' },
  { id: 'tp4', label: '25.000 Koin', harga: 25000,  bonus: '' },
  { id: 'tp5', label: '50.000 Koin', harga: 50000,  bonus: '' },
];

// Agar bisa di-require oleh server.js
if (typeof module !== 'undefined') module.exports = { CONFIG, TOPUP_PAKET };
