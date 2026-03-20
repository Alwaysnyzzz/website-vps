// auth.js — Auth helper global (Supabase REST API, tanpa SDK)

const Auth = {
  _base() { return CONFIG.SUPABASE_URL + '/auth/v1'; },
  _headers(withToken = false) {
    const h = { 'Content-Type': 'application/json', 'apikey': CONFIG.SUPABASE_ANON };
    if (withToken) h['Authorization'] = 'Bearer ' + this.getToken();
    return h;
  },
  getSession()  { try { return JSON.parse(localStorage.getItem('nyzz-session')); } catch { return null; } },
  getToken()    { return this.getSession()?.access_token || null; },
  isLoggedIn()  {
    const s = this.getSession();
    if (!s) return false;
    if (s.expires_at && Date.now()/1000 > s.expires_at) { this.logout(); return false; }
    return true;
  },
  setSession(s) { localStorage.setItem('nyzz-session', JSON.stringify(s)); },
  logout()      { localStorage.removeItem('nyzz-session'); localStorage.removeItem('nyzz-profile'); },

  async login(username, password) {
    const email = username.toLowerCase().trim() + '@nyzz.com';
    const r = await fetch(this._base() + '/token?grant_type=password', {
      method: 'POST', headers: this._headers(),
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description || d.msg || 'Login gagal');
    this.setSession(d);
    return d;
  },

  async register(username, password) {
    const email = username.toLowerCase().trim() + '@nyzz.com';
    // Sign up
    const r = await fetch(this._base() + '/signup', {
      method: 'POST', headers: this._headers(),
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description || d.msg || 'Register gagal');
    // Login langsung
    return this.login(username, password);
  },

  async getProfile(force = false) {
    if (!this.isLoggedIn()) return null;
    if (!force) {
      try { const c = JSON.parse(localStorage.getItem('nyzz-profile')); if (c?.username) return c; } catch {}
    }
    try {
      // Ambil user id dari session
      const session = this.getSession();
      const userId  = session?.user?.id;
      if (!userId) return null;
      const r = await fetch(CONFIG.SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId + '&select=*', {
        headers: { ...this._headers(), Authorization: 'Bearer ' + this.getToken() }
      });
      if (!r.ok) return null;
      const arr = await r.json();
      const p   = arr[0] || null;
      if (p) localStorage.setItem('nyzz-profile', JSON.stringify(p));
      return p;
    } catch { return null; }
  },

  async createProfile(username) {
    const session = this.getSession();
    const userId  = session?.user?.id;
    if (!userId) throw new Error('Tidak ada session');
    const r = await fetch(CONFIG.SUPABASE_URL + '/rest/v1/profiles', {
      method: 'POST',
      headers: { ...this._headers(), Authorization: 'Bearer ' + this.getToken(), Prefer: 'return=representation' },
      body: JSON.stringify({ id: userId, username: username.toLowerCase().trim(), coins: 0 })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Gagal membuat profil');
    return d[0];
  }
};
