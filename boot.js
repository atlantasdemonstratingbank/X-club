// boot.js — X Club v7 — App Initialisation (fires on DOMContentLoaded)
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  applyStoredTheme();
  initLandingParticles();

  // Seed one history entry so device back is intercepted
  window.history.replaceState({ page: 'root' }, '', window.location.pathname);

  // Safety net: if Firebase auth never fires within 8s, show landing
  const loaderFailsafe = setTimeout(() => { hideLoader(); showPage('landing'); }, 8000);

  try {
    await window.XFire.load();
    window.XF.onAuth(user => { clearTimeout(loaderFailsafe); onAuthChange(user); });
    setTimeout(loadBizFeed, 3000);
  } catch (err) {
    clearTimeout(loaderFailsafe);
    console.error('Firebase failed:', err); hideLoader(); showPage('landing');
  }
});
