// script.js — Global: sidebar, avatar, canvas stars

document.addEventListener('DOMContentLoaded', async function () {

  // ===== SIDEBAR TOGGLE =====
  const menuBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (menuBtn && sidebar && overlay) {
    menuBtn.onclick  = () => { sidebar.classList.add('active');    overlay.classList.add('active'); };
    overlay.onclick  = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
  }

  // ===== SIDEBAR AUTH MENU =====
  const authMenu = document.getElementById('sidebarAuthMenu');
  const navInit  = document.getElementById('navInitial');
  if (Auth.isLoggedIn()) {
    if (authMenu) authMenu.innerHTML =
      '<li><a href="/isisaldo" class="sidebar-auth-btn coins"><i class="fas fa-wallet"></i> Isi Saldo</a></li>'+
      '<li><a class="sidebar-auth-btn logout" id="btnLogout"><i class="fas fa-sign-out-alt"></i> Logout</a></li>';
    document.getElementById('btnLogout')?.addEventListener('click', () => { Auth.logout(); location.href='/login'; });
    Auth.getProfile().then(p => {
      if (!p) return;
      if (navInit) navInit.textContent = p.username.charAt(0).toUpperCase();
      // Update coins navbar
      const coinEl = document.getElementById('coinCount');
      if (coinEl) coinEl.textContent = Number(p.coins).toLocaleString('id-ID');
    });
  } else {
    if (authMenu) authMenu.innerHTML =
      '<li><a href="/login"    class="sidebar-auth-btn login"   ><i class="fas fa-sign-in-alt"></i> Login</a></li>'+
      '<li><a href="/register" class="sidebar-auth-btn register"><i class="fas fa-user-plus"></i> Register</a></li>';
  }

  // ===== LOADING SCREEN =====
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    const bar  = document.querySelector('.progress-bar');
    const text = document.getElementById('progress-text');
    if (sessionStorage.getItem('siteLoaded')) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.style.display = 'none', 400);
    } else {
      let progress = 0, stepIndex = 0;
      const steps  = [20, 45, 70, 90, 100];
      function nextStep() {
        if (stepIndex >= steps.length) {
          sessionStorage.setItem('siteLoaded', '1');
          setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.style.display = 'none', 500); }, 200);
          return;
        }
        const target = steps[stepIndex];
        const iv = setInterval(() => {
          if (progress < target) {
            progress++;
            if (bar)  bar.style.width   = progress + '%';
            if (text) text.textContent  = progress + '%';
          } else { clearInterval(iv); stepIndex++; setTimeout(nextStep, 300); }
        }, 15);
      }
      nextStep();
    }
  }

  // ===== CANVAS STARS =====
  const canvas = document.getElementById('canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    const cols = ['#00e5ff','#00ff88','#bf00ff'];
    const resize  = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const mkStars = () => {
      stars = [];
      const n = Math.min(80, Math.floor(window.innerWidth / 15));
      for (let i = 0; i < n; i++) stars.push({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        size: Math.random()*1.5+0.3, speed: Math.random()*0.25+0.05,
        color: cols[Math.floor(Math.random()*cols.length)]
      });
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fillStyle = s.color; ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 6; ctx.shadowColor = s.color;
        ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random()*canvas.width; }
      });
      requestAnimationFrame(draw);
    };
    window.addEventListener('resize', () => { resize(); mkStars(); });
    resize(); mkStars(); draw();
  }
});
