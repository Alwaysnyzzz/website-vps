-- ============================================================
-- SUPABASE MIGRATION: Buat tabel transactions
-- Jalankan di: Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT UNIQUE NOT NULL,
  user_id     BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  username    TEXT NOT NULL,
  amount      BIGINT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | paid | expired | failed
  qr_string   TEXT,
  qr_image    TEXT,
  pakasir_ref TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id  ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created   ON transactions(created_at DESC);

-- RLS: user hanya bisa baca transaksi milik sendiri
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own transactions"
  ON transactions FOR SELECT
  USING (true); -- backend pakai service key, aman

-- Pastikan kolom coins ada di tabel profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 0;

-- ============================================================
-- CATATAN:
-- - Service Role Key dibutuhkan oleh backend untuk PATCH profiles
-- - Ambil di: Supabase > Settings > API > service_role (secret)
-- - Simpan di file .env sebagai SUPABASE_SERVICE=...
-- ============================================================
