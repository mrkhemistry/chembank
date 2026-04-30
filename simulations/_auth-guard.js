// Simulations access guard
// ─────────────────────────────────────────────────────────────────────
// Free tier (anonymous + role 'student'): VSEPR + Nucleophilic Addition only
// Premium (role 'premium_student' / 'admin' / 'teacher'): all simulations
//
// USAGE:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="./_auth-guard.js"></script>
//   <script>SimAuth.guardPage();</script>   // on a premium sim page
//   // OR for the hub:
//   <script>SimAuth.applyHubLocks();</script>
// ─────────────────────────────────────────────────────────────────────
(function (global) {
  const SUPABASE_URL = 'https://fvjqsohhitpnkvfirosc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xwEiareEvHfeAEs9RciKlA_TtlIyH-j';
  const FREE_SIMS = ['vsepr', 'nucleophilic-addition'];
  const PREMIUM_ROLES = ['premium_student', 'admin', 'teacher'];
  const PORTAL_URL = 'https://mrkhemistry.github.io/chembank/portal.html';
  const SIMS_HUB_URL = './';

  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!global.supabase || !global.supabase.createClient) {
      console.warn('[SimAuth] Supabase client not loaded. Premium gating disabled.');
      return null;
    }
    _client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }

  async function getRole() {
    const sb = getClient();
    if (!sb) return null;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      const { data, error } = await sb
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (error) return null;
      return data?.role || null;
    } catch (e) {
      console.warn('[SimAuth] role lookup failed:', e);
      return null;
    }
  }

  async function isPremium() {
    const role = await getRole();
    return PREMIUM_ROLES.includes(role);
  }

  function isFreeSim(href) {
    return FREE_SIMS.some(s => (href || '').includes(s));
  }

  function currentSimSlug() {
    const path = global.location.pathname;
    const file = path.split('/').filter(Boolean).pop() || '';
    return file.replace('.html', '').toLowerCase();
  }

  function showUpgradeModal() {
    if (document.getElementById('_simUpgradeModal')) {
      document.getElementById('_simUpgradeModal').style.display = 'flex';
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = '_simUpgradeModal';
    overlay.innerHTML = `
      <div class="_sim-modal-bg"></div>
      <div class="_sim-modal-card">
        <div class="_sim-lock-icon">&#128274;</div>
        <h2>Premium simulation</h2>
        <p>This 3D simulation is part of the <strong>Mr Khemistry recording package</strong>.</p>
        <p class="_sim-modal-sub">Free users get full access to <strong>VSEPR Theory</strong> and <strong>Nucleophilic Addition</strong>. Sign in with a recording-package account to unlock the rest.</p>
        <div class="_sim-modal-btns">
          <a href="${PORTAL_URL}" class="_sim-btn-primary">Sign in</a>
          <button class="_sim-btn-secondary" onclick="document.getElementById('_simUpgradeModal').style.display='none'">Maybe later</button>
        </div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      #_simUpgradeModal {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        font-family: 'DM Sans', sans-serif;
      }
      #_simUpgradeModal ._sim-modal-bg {
        position: absolute; inset: 0; background: rgba(11,15,26,0.85); backdrop-filter: blur(8px);
      }
      #_simUpgradeModal ._sim-modal-card {
        position: relative; z-index: 1;
        background: #111827; border: 1px solid rgba(79,156,249,0.3);
        border-radius: 16px; padding: 36px 32px; max-width: 440px; width: 90%;
        text-align: center; color: #f0f4ff;
        box-shadow: 0 20px 80px rgba(0,0,0,0.6);
      }
      #_simUpgradeModal ._sim-lock-icon { font-size: 44px; margin-bottom: 14px; }
      #_simUpgradeModal h2 { font-family: 'DM Serif Display', serif; font-size: 26px; margin: 0 0 14px; color: #f0f4ff; }
      #_simUpgradeModal p { font-size: 15px; color: #b8c4dc; line-height: 1.6; margin: 0 0 12px; }
      #_simUpgradeModal ._sim-modal-sub { font-size: 13px; color: #7a8aaa; }
      #_simUpgradeModal ._sim-modal-btns { display: flex; gap: 10px; justify-content: center; margin-top: 22px; flex-wrap: wrap; }
      #_simUpgradeModal ._sim-btn-primary, #_simUpgradeModal ._sim-btn-secondary {
        padding: 10px 22px; border-radius: 100px; font-size: 14px; font-weight: 600;
        text-decoration: none; cursor: pointer; border: 1px solid transparent; font-family: inherit;
      }
      #_simUpgradeModal ._sim-btn-primary { background: #4f9cf9; color: #fff; }
      #_simUpgradeModal ._sim-btn-primary:hover { background: #3a87e6; }
      #_simUpgradeModal ._sim-btn-secondary { background: transparent; color: #b8c4dc; border-color: rgba(255,255,255,0.15); }
      #_simUpgradeModal ._sim-btn-secondary:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }

  // ───────── HUB MODE ─────────
  // Adds .locked class to sim cards that the current user can't access.
  // Click on a locked card opens the upgrade modal instead of navigating.
  async function applyHubLocks() {
    const premium = await isPremium();
    if (premium) return;          // admin / paying student: unlock everything

    // Inject lock CSS into the hub
    const style = document.createElement('style');
    style.textContent = `
      .sim-card._locked { opacity: 0.55; cursor: pointer; }
      .sim-card._locked:hover { transform: none; box-shadow: none; }
      .sim-card._locked .card-launch { color: #7a8aaa !important; }
      .sim-card._locked::after {
        content: '🔒 PREMIUM';
        position: absolute; top: 14px; left: 14px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
        background: rgba(79,156,249,0.15); border: 1px solid rgba(79,156,249,0.4);
        color: #93c5fd;
        padding: 4px 10px; border-radius: 100px;
        z-index: 5;
      }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.sim-card').forEach(card => {
      const href = card.getAttribute('href') || '';
      if (href === '#' || isFreeSim(href)) return;
      card.classList.add('_locked');
      card.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        showUpgradeModal();
      });
    });
  }

  // ───────── PER-PAGE GUARD ─────────
  // For individual premium sim pages. Hides the body until auth is verified;
  // shows a full-page lock screen if the user is not premium.
  async function guardPage() {
    // Skip on free sims
    const slug = currentSimSlug();
    if (FREE_SIMS.includes(slug)) return;

    // Inject CSS to hide the body until we decide what to show.
    // (Script is in <head>, so body may not exist yet; CSS rule still applies on render.)
    const hideStyle = document.createElement('style');
    hideStyle.id = '_simHideStyle';
    hideStyle.textContent = 'body { visibility: hidden !important; }';
    document.head.appendChild(hideStyle);

    const reveal = () => {
      const s = document.getElementById('_simHideStyle');
      if (s) s.remove();
      if (document.body) document.body.style.visibility = 'visible';
    };
    const whenBodyReady = (cb) => {
      if (document.body) cb();
      else document.addEventListener('DOMContentLoaded', cb);
    };

    const premium = await isPremium();
    if (premium) { reveal(); return; }

    // Replace body with lock screen
    whenBodyReady(() => {
      document.body.innerHTML = `
      <style>
        body { background: #0b0f1a; color: #f0f4ff; font-family: 'DM Sans', sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        ._lock-card { max-width: 460px; text-align: center; padding: 40px 32px; background: #111827; border: 1px solid rgba(79,156,249,0.3); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        ._lock-card h1 { font-family: 'DM Serif Display', serif; font-size: 28px; margin: 0 0 16px; }
        ._lock-card p { font-size: 15px; color: #b8c4dc; line-height: 1.6; margin: 0 0 14px; }
        ._lock-card ._sub { font-size: 13px; color: #7a8aaa; }
        ._lock-icon { font-size: 50px; margin-bottom: 14px; }
        ._btns { display: flex; gap: 10px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }
        ._btns a { padding: 10px 22px; border-radius: 100px; font-size: 14px; font-weight: 600; text-decoration: none; }
        ._btn-primary { background: #4f9cf9; color: #fff; }
        ._btn-primary:hover { background: #3a87e6; }
        ._btn-secondary { background: transparent; color: #b8c4dc; border: 1px solid rgba(255,255,255,0.15); }
        ._btn-secondary:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
      </style>
      <div class="_lock-card">
        <div class="_lock-icon">&#128274;</div>
        <h1>Premium simulation</h1>
        <p>This 3D simulation is part of the <strong>Mr Khemistry recording package</strong>.</p>
        <p class="_sub">Free users get full access to <strong>VSEPR Theory</strong> and <strong>Nucleophilic Addition</strong>. Sign in with a recording-package account to unlock the rest.</p>
        <div class="_btns">
          <a href="${PORTAL_URL}" class="_btn-primary">Sign in</a>
          <a href="${SIMS_HUB_URL}" class="_btn-secondary">Back to simulations</a>
        </div>
      </div>
    `;
      reveal();
    });
  }

  global.SimAuth = {
    FREE_SIMS,
    PREMIUM_ROLES,
    getRole,
    isPremium,
    isFreeSim,
    applyHubLocks,
    guardPage,
    showUpgradeModal,
  };
})(window);
