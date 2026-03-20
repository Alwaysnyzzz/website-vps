// auth.js — Auth custom: username + password hash di tabel profiles

const Auth = {
  getSession()  { try { return JSON.parse(localStorage.getItem('nyzz-session')); } catch { return null; } },
  isLoggedIn()  { const s=this.getSession(); if(!s?.token) return false; if(s.expires_at && Date.now()>s.expires_at){this.logout();return false;} return true; },
  setSession(s) { localStorage.setItem('nyzz-session', JSON.stringify(s)); },
  logout()      { localStorage.removeItem('nyzz-session'); localStorage.removeItem('nyzz-profile'); },

  async hash(str, salt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str + salt));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  },

  async login(username, password) {
    const u = username.toLowerCase().trim();
    const h = await this.hash(password, u);
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles?username=eq.${u}&select=id,username,coins,avatar_url,password_hash`, {
      headers: { apikey: CONFIG.SUPABASE_ANON, Authorization: `Bearer ${CONFIG.SUPABASE_ANON}` }
    });
    const arr = await r.json();
    if (!arr?.length) throw new Error('Username tidak ditemukan');
    const user = arr[0];
    if (user.password_hash !== h) throw new Error('Password salah');
    const session = { token: btoa(u+':'+h.substr(0,16)), username: u, user_id: user.id, expires_at: Date.now()+7*24*60*60*1000 };
    this.setSession(session);
    localStorage.setItem('nyzz-profile', JSON.stringify({ id:user.id, username:u, coins:user.coins, avatar_url:user.avatar_url }));
    return session;
  },

  async register(username, password) {
    const u = username.toLowerCase().trim();
    const h = await this.hash(password, u);
    const cek = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles?username=eq.${u}&select=id`, {
      headers: { apikey: CONFIG.SUPABASE_ANON, Authorization: `Bearer ${CONFIG.SUPABASE_ANON}` }
    });
    const exist = await cek.json();
    if (exist?.length) throw new Error('Username sudah dipakai');
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { apikey: CONFIG.SUPABASE_ANON, Authorization: `Bearer ${CONFIG.SUPABASE_ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ username: u, coins: 0, password_hash: h })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.message || 'Gagal membuat akun');
    return this.login(u, password);
  },

  async getProfile(force=false) {
    if (!this.isLoggedIn()) return null;
    if (!force) { try { const c=JSON.parse(localStorage.getItem('nyzz-profile')); if(c?.username) return c; } catch {} }
    const s = this.getSession();
    if (!s?.username) return null;
    try {
      const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles?username=eq.${s.username}&select=id,username,coins,avatar_url`, {
        headers: { apikey: CONFIG.SUPABASE_ANON, Authorization: `Bearer ${CONFIG.SUPABASE_ANON}` }
      });
      const arr = await r.json();
      const p   = arr?.[0] || null;
      if (p) localStorage.setItem('nyzz-profile', JSON.stringify(p));
      return p;
    } catch { return null; }
  }
};
