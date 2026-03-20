// config.js — Konfigurasi global
const CONFIG = {
  SUPABASE_URL:     'https://besavhrntlravtegavtk.supabase.co',
  SUPABASE_ANON:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlc2F2aHJudGxyYXZ0ZWdhdnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYyNjgsImV4cCI6MjA4OTU5MjI2OH0.pqo9P95eYhXsH5GX1DmD2n8bxPbFu2se69VPEoH_AHg',
  PAKASIR_PROJECT:  'toko-digital',
  PAKASIR_API_KEY:  'bFbp3ZZsqOEiXsxZ9nd69CZMWdZHXSNP',
  PAKASIR_ENDPOINT: 'https://app.pakasir.com/api/transactioncreate/qris',
  PAKASIR_STATUS:   'https://app.pakasir.com/api/transactionstatus',
};

// Paket topup coins
const TOPUP_PAKET = [
  { id: 'tp1',  coins: 1000,  harga: 10000,  label: '1.000 Koin',  bonus: '' },
  { id: 'tp2',  coins: 2500,  harga: 22000,  label: '2.500 Koin',  bonus: '+200 bonus' },
  { id: 'tp3',  coins: 5000,  harga: 42000,  label: '5.000 Koin',  bonus: '+500 bonus' },
  { id: 'tp4',  coins: 10000, harga: 80000,  label: '10.000 Koin', bonus: '+1.500 bonus' },
  { id: 'tp5',  coins: 25000, harga: 190000, label: '25.000 Koin', bonus: '+5.000 bonus' },
];
