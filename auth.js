// auth.js — Auth custom tanpa Supabase Auth, hash manual (works on HTTP)

const Auth = {
  getSession()  { try { return JSON.parse(localStorage.getItem('nyzz-session')); } catch { return null; } },
  isLoggedIn()  { const s=this.getSession(); if(!s?.token) return false; if(s.expires_at&&Date.now()>s.expires_at){this.logout();return false;} return true; },
  setSession(s) { localStorage.setItem('nyzz-session', JSON.stringify(s)); },
  logout()      { localStorage.removeItem('nyzz-session'); localStorage.removeItem('nyzz-profile'); },

  // Simple hash tanpa crypto.subtle (works HTTP/HTTPS)
  hash(str, salt) {
    const s   = str + salt;
    let h1=0xdeadbeef, h2=0x41c6ce57;
    for (let i=0;i<s.length;i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1^c, 2654435761);
      h2 = Math.imul(h2^c, 1597334677);
    }
    h1 = Math.imul(h1^(h1>>>16), 2246822507) ^ Math.imul(h2^(h2>>>13), 3266489909);
    h2 = Math.imul(h2^(h2>>>16), 2246822507) ^ Math.imul(h1^(h1>>>13), 3266489909);
    // Tambah iterasi biar lebih panjang
    let result = '';
    let a = (h1>>>0).toString(16).padStart(8,'0');
    let b = (h2>>>0).toString(16).padStart(8,'0');
    // Simple stretch
    for (let i=0;i<4;i++) {
      let x=0; for(let j=0;j<a.length;j++) x=(x*31+a.charCodeAt(j))>>>0;
      a = (x^h1>>>0).toString(16).padStart(8,'0');
      let y=0; for(let j=0;j<b.length;j++) y=(y*31+b.charCodeAt(j))>>>0;
      b = (y^h2>>>0).toString(16).padStart(8,'0');
      result += a + b;
    }
    return result;
  },

  async login(username, password) {
    const u = username.toLowerCase().trim();
    const h = this.hash(password, u);
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles?username=eq.${u}&select=id,username,coins,avatar_url,password_hash`, {
      headers: { apikey: CONFIG.SUPABASE_ANON, Authorization: `Bearer ${CONFIG.SUPABASE_ANON}` }
    });
    const arr = await r.json();
    if (!arr?.length) throw new Error('Username tidak ditemukan');
    const user = arr[0];
    if (user.password_hash !== h) throw new Error('Password salah');
    const session = { token: btoa(u+':'+h.substr(0,16)), username: u, user_id: user.id, expires_at: Date.now()+7*24*60*60*1000 };
    this.setSession(session);
    localStorage.setItem('nyzz-profile', JSON.stringify({ id:user.id, username:u, coins:user.coins||0, avatar_url:user.avatar_url }));
    return session;
  },

  async register(username, password) {
    const u = username.toLowerCase().trim();
    const h = this.hash(password, u);
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
      const p   = arr?.[0]||null;
      if (p) localStorage.setItem('nyzz-profile', JSON.stringify(p));
      return p;
    } catch { return null; }
  }
};
