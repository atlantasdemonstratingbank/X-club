// utils.js — X Club v7 — Helpers, Theme, Lightbox, PWA, Particles, Loader
// Load order: 2nd (after config.js)
'use strict';

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function $(id) { return document.getElementById(id); }

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

function avatarHTML(p, size = 'md') {
  if (p?.photoURL) return `<img class="avatar avatar-${size}" src="${p.photoURL}" alt="">`;
  return `<div class="avatar avatar-${size}">${p?.displayName ? p.displayName.charAt(0).toUpperCase() : '?'}</div>`;
}

function verifiedBadge(v, lg = false) {
  if (!v) return '';
  return `<span class="verified-badge${lg ? ' lg' : ''}" title="Verified"><svg viewBox="0 0 12 12" fill="none" style="width:60%;height:60%"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}

function showToast(msg) {
  const c = $('toastContainer'); if (!c) return;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

function escapeHTML(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCount(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function requireVerified(action) {
  // All features open to any logged-in user
  if (!currentUser) { showPage('login'); return false; }
  return true;
}
