// boot.js — X Club — App Initialisation (fires on DOMContentLoaded)
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  applyStoredTheme();
  if (typeof initLandingParticles === 'function') initLandingParticles();
  updateNavActive();

  // Safety net: if Firebase auth never fires within 8s, redirect to landing
  const loaderFailsafe = setTimeout(() => { hideLoader(); showPage('landing'); }, 8000);

  try {
    await window.XFire.load();
    window.XF.onAuth(user => { clearTimeout(loaderFailsafe); onAuthChange(user); });
    if (typeof loadBizFeed === 'function') setTimeout(loadBizFeed, 3000);
  } catch (err) {
    clearTimeout(loaderFailsafe);
    console.error('Firebase failed:', err); hideLoader(); showPage('landing');
  }
});
