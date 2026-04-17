/* app.js — X Club v4 */
'use strict';

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let currentUser    = null;
let currentProfile = null;
let activePage     = 'feed';
let prevPage       = null;
let feedTab        = 'for-you';
let activeConvUid  = null;
let msgUnsubscribe = null;
let onlineUnsubscribe = null;
let onlineMap      = {};        // uid → true/false
let unreadMsgMap   = {};        // uid → count
let deferredPwaPrompt = null;

const MEMBERSHIP_PRICE    = 1999;
const MEMBERSHIP_CURRENCY = 'EUR';
const FLW_PUBLIC_KEY      = 'FLWPUBK-9b3e74ad491f4e5e52d93bd09e3da203-X';
const ADMIN_UIDS          = [];   // populated from Firebase /admins node

/* ══════════════════════════════════════════════
   SVG ICON LIBRARY  (no keyboard emojis)
══════════════════════════════════════════════ */
const ICONS = {
  home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>`,
  discover: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bell: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  mail: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  admin: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  image: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  heart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  heartFilled: `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--danger)" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  comment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  xmark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  location: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  globe: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  phone: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>`,
  logoX: `<svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.737l7.73-8.835L2.25 2.25h6.946l4.261 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  verifiedBadge: `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1d9bf0"/><path d="M9.5 16.5l-4-4 1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5z" fill="white"/></svg>`,
  verifiedBadgeLg: `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1d9bf0"/><path d="M9.5 16.5l-4-4 1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5z" fill="white"/></svg>`,
  addHome: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>`,
  share2: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
  post: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function $(id) { return document.getElementById(id); }
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s/60) + 'm';
  if (s < 86400) return Math.floor(s/3600) + 'h';
  return Math.floor(s/86400) + 'd';
}
function avatarHTML(profile, size='md') {
  const isOnline = profile && onlineMap[profile.uid];
  const dot = isOnline ? '<span class="online-dot"></span>' : '';
  if (profile && profile.photoURL) {
    return `<span class="avatar-wrap"><img class="avatar avatar-${size}" src="${profile.photoURL}" alt="${escapeHTML(profile.displayName||'')}"></span>`;
  }
  const initials = (profile && profile.displayName) ? profile.displayName.charAt(0).toUpperCase() : '?';
  return `<span class="avatar-wrap"><div class="avatar avatar-${size}">${initials}</div>${dot}</span>`;
}
function verifiedBadge(verified, lg=false) {
  if (!verified) return '';
  return `<span class="verified-badge" title="Verified Member">${lg ? ICONS.verifiedBadgeLg : ICONS.verifiedBadge}</span>`;
}
function isAdmin(uid) {
  return ADMIN_UIDS.includes(uid);
}
function showToast(msg) {
  const c = $('toastContainer');
  const t = el('div', 'toast', escapeHTML(msg));
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
function requireVerified(action) {
  if (!currentUser) { showPage('login'); return false; }
  if (!currentProfile || !currentProfile.verified) { showPaywall(action); return false; }
  return true;
}
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════
   APP LOADER
══════════════════════════════════════════════ */
function hideLoader() {
  const l = $('appLoader');
  if (l) { l.classList.add('gone'); setTimeout(() => l.remove(), 600); }
  const app = $('app');
  if (app) app.classList.add('visible');
}

/* ══════════════════════════════════════════════
   PAGE ROUTING + TRANSITIONS
══════════════════════════════════════════════ */
const PAGE_ORDER = ['landing','login','register','reset','feed','discover','notifications','messages','profile','user-profile','admin'];

function showPage(name, opts={}) {
  if (name === 'feed' && !currentUser) name = 'landing';
  if (name === 'admin' && (!currentUser || !isAdmin(currentUser.uid))) { showToast('Access denied'); return; }

  const direction = getTransitionDir(activePage, name);
  prevPage = activePage;

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active','slide-left','slide-right');
  });

  const pg = $('page-' + name);
  if (pg) {
    pg.classList.add('active');
    if (direction === 'right') pg.classList.add('slide-left');
    else if (direction === 'left') pg.classList.add('slide-right');
  }

  activePage = name;
  updateNavActive();
  window.scrollTo(0, 0);

  if (name === 'feed')          renderFeed();
  if (name === 'discover')      renderDiscover();
  if (name === 'notifications') renderNotifications();
  if (name === 'messages')      renderConversations();
  if (name === 'profile')       renderOwnProfile();
  if (name === 'user-profile')  renderUserProfile(opts.uid);
  if (name === 'admin')         renderAdminPanel();
}

function getTransitionDir(from, to) {
  const fi = PAGE_ORDER.indexOf(from);
  const ti = PAGE_ORDER.indexOf(to);
  if (fi === -1 || ti === -1) return 'none';
  return ti > fi ? 'right' : 'left';
}

function updateNavActive() {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.nav-link[data-page="${activePage}"]`);
  if (active) active.classList.add('active');
  document.querySelectorAll('.mobile-nav-link').forEach(l => l.classList.remove('active'));
  const mactive = document.querySelector(`.mobile-nav-link[data-page="${activePage}"]`);
  if (mactive) mactive.classList.add('active');
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const email = $('loginEmail').value.trim();
  const pass  = $('loginPass').value;
  const btn   = $('loginBtn');
  if (!email || !pass) return showToast('Please fill in all fields');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    await window.XF.signIn(email, pass);
  } catch(err) {
    showToast(friendlyError(err.code));
    btn.disabled = false; btn.textContent = 'Sign in';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name   = $('regName').value.trim();
  const email  = $('regEmail').value.trim();
  const pass   = $('regPass').value;
  const handle = $('regHandle').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const btn    = $('regBtn');
  if (!name || !email || !pass || !handle) return showToast('Please fill in all fields');
  if (pass.length < 8)  return showToast('Password must be at least 8 characters');
  if (handle.length < 3) return showToast('Handle must be at least 3 characters');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const cred = await window.XF.signUp(email, pass);
    await window.XF.updateProfile({ displayName: name });
    await window.XF.set(`users/${cred.user.uid}`, {
      uid: cred.user.uid, displayName: name, handle, email,
      bio: '', photoURL: '', verified: false,
      followersCount: 0, followingCount: 0, postsCount: 0,
      joinedAt: window.XF.ts(),
    });
    showToast('Welcome to X Club!');
  } catch(err) {
    showToast(friendlyError(err.code));
    btn.disabled = false; btn.textContent = 'Create account';
  }
}

async function handleGoogleAuth() {
  try {
    const cred = await window.XF.googleAuth();
    const snap = await window.XF.get(`users/${cred.user.uid}`);
    if (!snap.exists()) {
      const handle = cred.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
      await window.XF.set(`users/${cred.user.uid}`, {
        uid: cred.user.uid, displayName: cred.user.displayName || 'Member',
        handle, email: cred.user.email, bio: '',
        photoURL: cred.user.photoURL || '', verified: false,
        followersCount: 0, followingCount: 0, postsCount: 0,
        joinedAt: window.XF.ts(),
      });
    }
  } catch(err) { showToast(friendlyError(err.code)); }
}

async function handleLogout() {
  if (onlineUnsubscribe) onlineUnsubscribe();
  if (currentUser) window.XF.setOnline(currentUser.uid, false);
  await window.XF.signOut();
  currentProfile = null; currentUser = null;
  showPage('landing');
}

function friendlyError(code) {
  const m = {
    'auth/user-not-found': 'No account found with that email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-email': 'Invalid email address',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
    'auth/network-request-failed': 'Network error — check your connection',
    'auth/invalid-credential': 'Incorrect email or password',
  };
  return m[code] || 'Something went wrong. Please try again.';
}

async function onAuthChange(user) {
  currentUser = user;
  if (user) {
    const snap = await window.XF.get(`users/${user.uid}`);
    currentProfile = snap.exists() ? snap.val() : null;

    // Load admin list
    const adminSnap = await window.XF.get('admins');
    ADMIN_UIDS.length = 0;
    if (adminSnap.exists()) adminSnap.forEach(c => ADMIN_UIDS.push(c.key));

    // Check subscription expiry
    await checkSubscriptionExpiry();

    updateNavUser();
    updateComposerAvatar();
    loadSuggested();
    startNotifWatch();
    startMsgUnreadWatch();
    startOnlinePresence();
    showAdminNavLink();

    if (['landing','login','register'].includes(activePage)) showPage('feed');
    else showPage(activePage);
  } else {
    updateNavUser();
    showPage('landing');
  }
  hideLoader();

  // PWA install banner after login
  setTimeout(checkPwaBanner, 3500);
}

/* ══════════════════════════════════════════════
   SUBSCRIPTION EXPIRY CHECK
══════════════════════════════════════════════ */
async function checkSubscriptionExpiry() {
  if (!currentUser || !currentProfile) return;
  if (!currentProfile.verified) return;
  const nextBilling = currentProfile.nextBillingDate;
  if (nextBilling && Date.now() > nextBilling) {
    // Subscription lapsed — revoke
    await window.XF.update(`users/${currentUser.uid}`, { verified: false, subscriptionStatus: 'expired' });
    currentProfile.verified = false;
    currentProfile.subscriptionStatus = 'expired';
    showToast('Your subscription has expired. Renew to stay verified.');
  }
}

/* ══════════════════════════════════════════════
   NAV USER INFO
══════════════════════════════════════════════ */
function updateNavUser() {
  const wrap = $('navUserWrap');
  if (!wrap) return;
  if (currentUser && currentProfile) {
    wrap.style.display = 'flex';
    const nameEl   = $('navUserName');
    const handleEl = $('navUserHandle');
    if (nameEl)   nameEl.innerHTML  = escapeHTML(currentProfile.displayName || 'Member') + verifiedBadge(currentProfile.verified);
    if (handleEl) handleEl.textContent = '@' + (currentProfile.handle || 'member');
    // re-render avatar
    const avatarWrap = $('navUserAvatar');
    if (avatarWrap && currentProfile.photoURL) {
      avatarWrap.innerHTML = `<img class="avatar avatar-md" src="${currentProfile.photoURL}" alt="">`;
    }
  } else {
    wrap.style.display = 'none';
  }
}

function updateComposerAvatar() {
  const el = $('composerAvatarWrap');
  if (el && currentProfile) {
    el.innerHTML = avatarHTML(currentProfile, 'md');
  }
}

function showAdminNavLink() {
  const link = $('navAdminLink');
  if (link) link.style.display = (currentUser && isAdmin(currentUser.uid)) ? 'flex' : 'none';
  const mlink = $('mobileAdminLink');
  if (mlink) mlink.style.display = (currentUser && isAdmin(currentUser.uid)) ? 'flex' : 'none';
}

/* ══════════════════════════════════════════════
   ONLINE PRESENCE
══════════════════════════════════════════════ */
function startOnlinePresence() {
  if (!currentUser) return;
  const uid = currentUser.uid;
  window.XF.setOnline(uid, true);

  // Watch all users online status
  onlineUnsubscribe = window.XF.on('online', snap => {
    onlineMap = snap.exists() ? snap.val() : {};
  });

  // Set offline on window close
  window.addEventListener('beforeunload', () => window.XF.setOnline(uid, false));
}

/* ══════════════════════════════════════════════
   PAYWALL / PAYMENT
══════════════════════════════════════════════ */
function showPaywall(action='') {
  $('paywallModal').classList.add('open');
}
function closePaywall() {
  $('paywallModal').classList.remove('open');
}

function initiatePayment() {
  if (!currentUser || !currentProfile) { showToast('Please sign in first'); return; }
  if (typeof FlutterwaveCheckout === 'undefined') {
    showToast('Payment system loading — please try again');
    return;
  }
  const txRef = 'XCLUB-' + currentUser.uid + '-' + Date.now();
  FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY,
    tx_ref: txRef,
    amount: MEMBERSHIP_PRICE,
    currency: MEMBERSHIP_CURRENCY,
    payment_options: 'card,banktransfer',
    payment_plan: '', // Flutterwave payment plan ID for recurring — set this to your plan ID
    customer: {
      email: currentUser.email,
      name:  currentProfile.displayName || 'Member',
    },
    customizations: {
      title:       'X Club Membership',
      description: 'Monthly verified membership — €1,999/month, recurring',
      logo:        '',
    },
    callback: async function(data) {
      if (data.status === 'successful' || data.status === 'completed') {
        try {
          const now = Date.now();
          const nextBilling = now + (30 * 24 * 60 * 60 * 1000); // +30 days
          await window.XF.update(`users/${currentUser.uid}`, {
            verified: true,
            verifiedAt: window.XF.ts(),
            subscriptionStatus: 'active',
            paymentRef: data.transaction_id,
            lastBillingDate: now,
            nextBillingDate: nextBilling,
            flwTxRef: txRef,
          });
          currentProfile.verified = true;
          currentProfile.subscriptionStatus = 'active';
          currentProfile.nextBillingDate = nextBilling;
          closePaywall();
          showToast('You are now a verified member!');
          updateNavUser();
          // Log payment
          await window.XF.push(`payments/${currentUser.uid}`, {
            txRef, txId: data.transaction_id,
            amount: MEMBERSHIP_PRICE, currency: MEMBERSHIP_CURRENCY,
            status: 'successful', paidAt: now,
          });
        } catch(err) {
          showToast('Payment confirmed but update failed — contact support');
        }
      } else {
        showToast('Payment was not completed');
      }
    },
    onclose: function() {},
  });
}

/* ══════════════════════════════════════════════
   FEED
══════════════════════════════════════════════ */
async function renderFeed() {
  const container = $('feedPosts');
  if (!container) return;

  // Show skeletons
  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-post">
      <div class="skeleton sk-avatar"></div>
      <div class="sk-body">
        <div class="skeleton sk-line w-40"></div>
        <div class="skeleton sk-line w-80"></div>
        <div class="skeleton sk-line w-60"></div>
      </div>
    </div>`).join('');

  try {
    const snap = await window.XF.get('posts');
    const posts = [];
    if (snap.exists()) snap.forEach(c => posts.push({ id: c.key, ...c.val() }));
    posts.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

    // Feed tab filter
    let filtered = posts;
    if (feedTab === 'verified') filtered = posts.filter(p => {/* will filter by author after loading profiles */});

    if (filtered.length === 0 && feedTab !== 'verified') {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.post}</div>
          <div class="empty-state-title">Nothing here yet</div>
          <div class="empty-state-desc">Be the first to post something</div>
        </div>`;
      return;
    }

    const uids = [...new Set(posts.map(p => p.authorUid))];
    const profiles = {};
    await Promise.all(uids.map(async uid => {
      const s = await window.XF.get(`users/${uid}`);
      if (s.exists()) profiles[uid] = s.val();
    }));

    let displayPosts = posts;
    if (feedTab === 'verified') displayPosts = posts.filter(p => profiles[p.authorUid] && profiles[p.authorUid].verified);

    if (displayPosts.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No verified posts yet</div></div>`;
      return;
    }

    container.innerHTML = displayPosts.map(p => postHTML(p, profiles[p.authorUid])).join('');
  } catch(err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load posts</div></div>';
  }
}

function postHTML(post, author) {
  const isLiked = currentUser && post.likes && post.likes[currentUser.uid];
  const likeCount = post.likes ? Object.keys(post.likes).length : 0;
  const commentCount = post.commentCount || 0;
  const isEvent = post.type === 'event';
  const isOwn = currentUser && post.authorUid === currentUser.uid;

  let mediaHTML = '';
  if (post.imageURL) {
    mediaHTML = `<img class="post-image" src="${post.imageURL}" alt="Post image" loading="lazy">`;
  }
  if (isEvent) {
    mediaHTML += `
      <div class="post-event-card">
        <span class="post-event-badge ${post.eventPrivate ? 'badge-private' : 'badge-public'}">
          ${post.eventPrivate ? ICONS.lock + ' Private Event' : ICONS.globe + ' Open Event'}
        </span>
        <div class="post-event-title">${escapeHTML(post.eventTitle || '')}</div>
        <div class="post-event-meta">
          ${post.eventDate     ? `<span>${ICONS.calendar} ${post.eventDate}</span>` : ''}
          ${post.eventTime     ? `<span>${ICONS.clock} ${post.eventTime}</span>` : ''}
          ${post.eventLocation ? `<span>${ICONS.location} ${escapeHTML(post.eventLocation)}</span>` : ''}
        </div>
      </div>`;
  }

  return `
    <div class="post" data-id="${post.id}" onclick="openPost('${post.id}', event)">
      <div onclick="openUserProfile('${post.authorUid}', event)">
        ${avatarHTML(author, 'md')}
      </div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name">${escapeHTML(author ? author.displayName : 'Unknown')}</span>
          ${verifiedBadge(author && author.verified)}
          <span class="post-handle">@${escapeHTML(author ? author.handle : 'unknown')}</span>
          <span class="post-time">· ${timeAgo(post.createdAt)}</span>
        </div>
        <div class="post-text">${escapeHTML(post.text || '')}</div>
        ${mediaHTML}
        <div class="post-actions" onclick="event.stopPropagation()">
          <div class="post-action comment" onclick="openPost('${post.id}', event)">
            ${ICONS.comment} ${commentCount > 0 ? commentCount : ''}
          </div>
          <div class="post-action like ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
            ${isLiked ? ICONS.heartFilled : ICONS.heart} ${likeCount > 0 ? likeCount : ''}
          </div>
          <div class="post-action share" onclick="sharePost('${post.id}')">
            ${ICONS.share}
          </div>
          ${isOwn ? `<div class="post-action delete" onclick="deletePost('${post.id}', this)">${ICONS.trash}</div>` : ''}
        </div>
      </div>
    </div>`;
}

/* ── Submit post ── */
async function submitPost() {
  if (!requireVerified('post')) return;
  const textarea  = $('postText');
  const text      = textarea.value.trim();
  const imageInput = $('postImageInput');
  const isEvent   = $('postTypeEvent') && $('postTypeEvent').classList.contains('active');
  if (!text && !imageInput.files[0] && !isEvent) return showToast('Write something first');

  const btn = $('postSubmitBtn');
  btn.disabled = true; btn.textContent = 'Posting…';

  try {
    let imageURL = '';
    if (imageInput.files[0]) {
      showToast('Uploading image…');
      const result = await window.XCloud.upload(imageInput.files[0], 'x_posts');
      imageURL = result.url;
    }

    const postData = {
      authorUid: currentUser.uid, text, imageURL,
      type: isEvent ? 'event' : 'post',
      createdAt: window.XF.ts(), commentCount: 0,
    };
    if (isEvent) {
      postData.eventTitle    = $('eventTitle').value.trim();
      postData.eventDate     = $('eventDate').value;
      postData.eventTime     = $('eventTime').value;
      postData.eventLocation = $('eventLocation').value.trim();
      postData.eventPrivate  = $('eventPrivate').checked;
    }

    await window.XF.push('posts', postData);
    await window.XF.update(`users/${currentUser.uid}`, { postsCount: (currentProfile.postsCount || 0) + 1 });
    currentProfile.postsCount = (currentProfile.postsCount || 0) + 1;

    textarea.value = ''; imageInput.value = '';
    $('postImagePreview').innerHTML = '';
    if (isEvent) togglePostType('post');
    showToast('Posted!');
    renderFeed();
  } catch(err) {
    showToast('Failed to post — try again');
  } finally {
    btn.disabled = false; btn.textContent = 'Post';
  }
}

function previewPostImage(input) {
  const preview = $('postImagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div class="img-preview-wrap">
          <img src="${e.target.result}">
          <div class="img-preview-remove" onclick="removePostImage()">${ICONS.xmark}</div>
        </div>`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}
function removePostImage() { $('postImageInput').value = ''; $('postImagePreview').innerHTML = ''; }

function togglePostType(type) {
  const eventFields = $('eventFields');
  const btnPost  = $('postTypePost');
  const btnEvent = $('postTypeEvent');
  if (type === 'event') {
    eventFields.style.display = 'block';
    btnEvent && btnEvent.classList.add('active');
    btnPost  && btnPost.classList.remove('active');
  } else {
    eventFields.style.display = 'none';
    btnPost  && btnPost.classList.add('active');
    btnEvent && btnEvent.classList.remove('active');
  }
}

/* ── Like ── */
async function toggleLike(postId, el) {
  if (!requireVerified('like posts')) return;
  el.classList.add('popping');
  setTimeout(() => el.classList.remove('popping'), 400);
  const uid = currentUser.uid;
  const snap = await window.XF.get(`posts/${postId}/likes/${uid}`);
  if (snap.exists()) {
    await window.XF.remove(`posts/${postId}/likes/${uid}`);
    el.classList.remove('liked');
    const c = parseInt(el.textContent.replace(/\D/g,'')) || 1;
    el.innerHTML = ICONS.heart + (c > 1 ? ` ${c-1}` : '');
  } else {
    await window.XF.set(`posts/${postId}/likes/${uid}`, true);
    el.classList.add('liked');
    const c = parseInt(el.textContent.replace(/\D/g,'')) || 0;
    el.innerHTML = ICONS.heartFilled + ` ${c+1}`;
  }
}

/* ── Delete post ── */
async function deletePost(postId, el) {
  if (!currentUser) return;
  if (!confirm('Delete this post?')) return;
  try {
    await window.XF.remove(`posts/${postId}`);
    await window.XF.remove(`comments/${postId}`);
    await window.XF.update(`users/${currentUser.uid}`, { postsCount: Math.max(0, (currentProfile.postsCount||1)-1) });
    currentProfile.postsCount = Math.max(0, (currentProfile.postsCount||1)-1);
    showToast('Post deleted');
    renderFeed();
  } catch(e) { showToast('Could not delete post'); }
}

/* ── Open post detail ── */
async function openPost(postId, e) {
  if (e) e.stopPropagation();
  if (!currentUser) { showPage('login'); return; }
  const snap = await window.XF.get(`posts/${postId}`);
  if (!snap.exists()) return;
  const post = { id: postId, ...snap.val() };
  const authorSnap = await window.XF.get(`users/${post.authorUid}`);
  const author = authorSnap.exists() ? authorSnap.val() : null;

  const modal = $('postModal');
  const body  = $('postModalBody');
  body.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid var(--border)">
      ${postHTML(post, author)}
    </div>
    <div id="commentsArea"></div>
    <div class="comment-composer" style="padding:12px 16px;border-top:1px solid var(--border);background:var(--bg);position:sticky;bottom:0;display:flex;gap:10px;align-items:center">
      ${avatarHTML(currentProfile, 'sm')}
      <input id="commentInput" class="comment-input" placeholder="Post your reply">
      <button class="btn btn-accent btn-sm" onclick="submitComment('${postId}')">${ICONS.send}</button>
    </div>`;
  modal.classList.add('open');
  loadComments(postId);
}

async function loadComments(postId) {
  const area = $('commentsArea');
  if (!area) return;
  area.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  const snap = await window.XF.get(`comments/${postId}`);
  const comments = [];
  if (snap.exists()) snap.forEach(c => comments.push({ id: c.key, ...c.val() }));
  comments.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  if (comments.length === 0) { area.innerHTML = ''; return; }

  const uids = [...new Set(comments.map(c => c.authorUid))];
  const profiles = {};
  await Promise.all(uids.map(async uid => {
    const s = await window.XF.get(`users/${uid}`);
    if (s.exists()) profiles[uid] = s.val();
  }));

  area.innerHTML = '<div class="comments-section">' + comments.map(c => {
    const a = profiles[c.authorUid];
    return `
      <div class="comment">
        ${avatarHTML(a, 'sm')}
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-name">${escapeHTML(a ? a.displayName : 'Unknown')}</span>
            ${verifiedBadge(a && a.verified)}
            <span class="comment-time">${timeAgo(c.createdAt)}</span>
          </div>
          <div class="comment-text">${escapeHTML(c.text || '')}</div>
        </div>
      </div>`;
  }).join('') + '</div>';
}

async function submitComment(postId) {
  if (!requireVerified('comment')) return;
  const input = $('commentInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await window.XF.push(`comments/${postId}`, {
    authorUid: currentUser.uid, text, createdAt: window.XF.ts(),
  });
  const snap = await window.XF.get(`posts/${postId}/commentCount`);
  const count = snap.exists() ? (snap.val() || 0) : 0;
  await window.XF.set(`posts/${postId}/commentCount`, count + 1);
  loadComments(postId);
}

function sharePost(postId) {
  const url = window.location.origin + '?post=' + postId;
  if (navigator.clipboard) navigator.clipboard.writeText(url);
  showToast('Link copied!');
}

/* ══════════════════════════════════════════════
   DISCOVER
══════════════════════════════════════════════ */
async function renderDiscover() {
  const container = $('discoverPeople');
  if (!container) return;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const snap = await window.XF.get('users');
    const people = [];
    if (snap.exists()) snap.forEach(c => { if (c.key !== (currentUser && currentUser.uid)) people.push(c.val()); });

    if (people.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.user}</div><div class="empty-state-title">No members yet</div></div>`;
      return;
    }

    const myConnSnap = currentUser ? await window.XF.get(`connections/${currentUser.uid}`) : null;
    const myConns = myConnSnap && myConnSnap.exists() ? myConnSnap.val() : {};
    const myReqSnap = currentUser ? await window.XF.get(`connectionRequests`) : null;

    container.innerHTML = people.map(p => {
      const status = myConns[p.uid] ? 'connected' :
        (myReqSnap && myReqSnap.exists() && myReqSnap.val()[`${currentUser&&currentUser.uid}_${p.uid}`]) ? 'pending' : 'none';
      return `
        <div class="people-card" onclick="openUserProfile('${p.uid}', event)">
          ${avatarHTML(p, 'md')}
          <div class="people-card-info">
            <div class="people-card-name">${escapeHTML(p.displayName || 'Member')}${verifiedBadge(p.verified)}</div>
            <div class="people-card-handle">@${escapeHTML(p.handle || 'member')}</div>
            <div class="people-card-bio">${escapeHTML(p.bio || '')}</div>
          </div>
          <div onclick="event.stopPropagation()">
            ${connectBtnHTML(p.uid, status)}
          </div>
        </div>`;
    }).join('');
  } catch(err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load members</div></div>';
  }
}

function connectBtnHTML(uid, status) {
  if (!currentUser || uid === currentUser.uid) return '';
  if (status === 'connected') return `<button class="btn btn-following btn-sm" onclick="disconnect('${uid}')">Connected</button>`;
  if (status === 'pending')   return `<button class="btn btn-outline btn-sm" disabled>Pending</button>`;
  return `<button class="btn btn-primary btn-sm" onclick="sendConnectionRequest('${uid}')">Connect</button>`;
}

async function sendConnectionRequest(toUid) {
  if (!requireVerified('connect with members')) return;
  const reqId = `${currentUser.uid}_${toUid}`;
  await window.XF.set(`connectionRequests/${reqId}`, {
    from: currentUser.uid, to: toUid, status: 'pending', createdAt: window.XF.ts(),
  });
  await window.XF.push(`notifications/${toUid}`, {
    type: 'connection_request', fromUid: currentUser.uid,
    fromName: currentProfile.displayName, reqId,
    createdAt: window.XF.ts(), read: false,
  });
  showToast('Connection request sent!');
  renderDiscover();
}

async function acceptConnection(reqId, fromUid) {
  const myUid = currentUser.uid;
  await window.XF.update(`connectionRequests/${reqId}`, { status: 'accepted' });
  await window.XF.set(`connections/${myUid}/${fromUid}`, true);
  await window.XF.set(`connections/${fromUid}/${myUid}`, true);
  const mySnap    = await window.XF.get(`users/${myUid}/followersCount`);
  const theirSnap = await window.XF.get(`users/${fromUid}/followersCount`);
  await window.XF.set(`users/${myUid}/followersCount`,    ((mySnap.val()||0)+1));
  await window.XF.set(`users/${fromUid}/followersCount`, ((theirSnap.val()||0)+1));
  currentProfile.followersCount = (currentProfile.followersCount||0)+1;
  await window.XF.push(`notifications/${fromUid}`, {
    type: 'connection_accepted', fromUid: myUid, fromName: currentProfile.displayName,
    createdAt: window.XF.ts(), read: false,
  });
  showToast('Connection accepted!');
  renderNotifications();
}

async function declineConnection(reqId) {
  await window.XF.update(`connectionRequests/${reqId}`, { status: 'declined' });
  showToast('Request declined');
  renderNotifications();
}

async function disconnect(uid) {
  if (!currentUser) return;
  await window.XF.remove(`connections/${currentUser.uid}/${uid}`);
  await window.XF.remove(`connections/${uid}/${currentUser.uid}`);
  showToast('Disconnected');
  renderDiscover();
}

/* ══════════════════════════════════════════════
   USER PROFILE
══════════════════════════════════════════════ */
async function openUserProfile(uid, e) {
  if (e) e.stopPropagation();
  if (uid === (currentUser && currentUser.uid)) { showPage('profile'); return; }
  showPage('user-profile', { uid });
}

async function renderUserProfile(uid) {
  const container = $('userProfileContent');
  if (!container || !uid) return;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const snap = await window.XF.get(`users/${uid}`);
    if (!snap.exists()) { container.innerHTML = '<div class="empty-state"><div class="empty-state-title">User not found</div></div>'; return; }
    const profile = snap.val();

    let connStatus = 'none';
    if (currentUser) {
      const connSnap = await window.XF.get(`connections/${currentUser.uid}/${uid}`);
      if (connSnap.exists()) connStatus = 'connected';
      else {
        const reqSnap = await window.XF.get(`connectionRequests/${currentUser.uid}_${uid}`);
        if (reqSnap.exists() && reqSnap.val().status === 'pending') connStatus = 'pending';
      }
    }

    const postsSnap = await window.XF.get('posts');
    const posts = [];
    if (postsSnap.exists()) postsSnap.forEach(c => { const p = c.val(); if (p.authorUid === uid) posts.push({ id: c.key, ...p }); });
    posts.sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

    container.innerHTML = `
      <div class="profile-banner"><div style="width:100%;height:100%;background:var(--bg-3)"></div></div>
      <div class="profile-info-section">
        <div class="profile-name-row">
          <div class="profile-avatar-wrap">${avatarHTML(profile, 'xl')}</div>
          <div style="display:flex;gap:8px;padding-top:12px">
            ${currentUser && uid !== currentUser.uid ? connectBtnHTML(uid, connStatus) : ''}
            ${connStatus === 'connected' ? `<button class="btn btn-outline btn-sm" onclick="openDMWith('${uid}')">${ICONS.mail}</button>` : ''}
          </div>
        </div>
        <div class="profile-name">${escapeHTML(profile.displayName || 'Member')}${verifiedBadge(profile.verified, true)}</div>
        <div class="profile-handle">@${escapeHTML(profile.handle || 'member')}</div>
        ${profile.bio ? `<div class="profile-bio">${escapeHTML(profile.bio)}</div>` : ''}
        <div class="profile-stats">
          <div class="profile-stat"><strong>${profile.followersCount||0}</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong>${profile.followingCount||0}</strong> <span>Following</span></div>
          <div class="profile-stat"><strong>${profile.postsCount||0}</strong> <span>Posts</span></div>
        </div>
      </div>
      <div class="profile-tabs"><div class="profile-tab active">Posts</div></div>
      <div id="userPostsFeed">
        ${posts.length === 0
          ? '<div class="empty-state"><div class="empty-state-desc">No posts yet</div></div>'
          : posts.map(p => postHTML(p, profile)).join('')}
      </div>`;
  } catch(err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load profile</div></div>';
  }
}

/* ══════════════════════════════════════════════
   OWN PROFILE
══════════════════════════════════════════════ */
async function renderOwnProfile() {
  if (!currentUser || !currentProfile) { showPage('login'); return; }
  const container = $('ownProfileContent');
  if (!container) return;
  const postsSnap = await window.XF.get('posts');
  const posts = [];
  if (postsSnap.exists()) postsSnap.forEach(c => { const p = c.val(); if (p.authorUid === currentUser.uid) posts.push({ id: c.key, ...p }); });
  posts.sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  const subStatus = currentProfile.subscriptionStatus;
  const nextBilling = currentProfile.nextBillingDate;
  let subChip = '';
  if (subStatus === 'active' && nextBilling) {
    subChip = `<span class="sub-info-chip active">${ICONS.check} Active · renews ${new Date(nextBilling).toLocaleDateString()}</span>`;
  } else if (subStatus === 'expired') {
    subChip = `<span class="sub-info-chip expired">Subscription expired</span>`;
  }

  container.innerHTML = `
    <div class="profile-banner"><div style="width:100%;height:100%;background:var(--bg-3)"></div></div>
    <div class="profile-info-section">
      <div class="profile-name-row">
        <div class="profile-avatar-wrap">
          ${avatarHTML(currentProfile, 'xl')}
          <label class="profile-photo-overlay" for="profilePhotoInput" title="Change photo">
            ${ICONS.camera}
          </label>
          <input id="profilePhotoInput" type="file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this)">
        </div>
        <button class="btn btn-outline btn-sm" onclick="showEditProfile()">${ICONS.edit} Edit</button>
      </div>
      <div class="profile-name">${escapeHTML(currentProfile.displayName||'Member')}${verifiedBadge(currentProfile.verified, true)}</div>
      <div class="profile-handle">@${escapeHTML(currentProfile.handle||'member')}</div>
      ${currentProfile.bio ? `<div class="profile-bio">${escapeHTML(currentProfile.bio)}</div>` : '<div class="profile-bio text-dim">No bio yet</div>'}
      ${subChip}
      ${!currentProfile.verified ? `
        <div style="margin:12px 0">
          <button class="btn btn-accent" onclick="showPaywall()">${verifiedBadge(true)} Get Verified — €1,999/month</button>
        </div>` : ''}
      <div class="profile-stats">
        <div class="profile-stat"><strong>${currentProfile.followersCount||0}</strong> <span>Followers</span></div>
        <div class="profile-stat"><strong>${currentProfile.followingCount||0}</strong> <span>Following</span></div>
        <div class="profile-stat"><strong>${currentProfile.postsCount||0}</strong> <span>Posts</span></div>
      </div>
    </div>
    <div class="profile-tabs"><div class="profile-tab active">Posts</div></div>
    <div>
      ${posts.length === 0
        ? '<div class="empty-state"><div class="empty-state-desc">No posts yet — share something!</div></div>'
        : posts.map(p => postHTML(p, currentProfile)).join('')}
    </div>`;
}

async function uploadProfilePhoto(input) {
  if (!input.files[0]) return;
  showToast('Uploading photo…');
  try {
    const result = await window.XCloud.upload(input.files[0], 'x_profiles');
    await window.XF.update(`users/${currentUser.uid}`, { photoURL: result.url });
    await window.XF.updateProfile({ photoURL: result.url });
    currentProfile.photoURL = result.url;
    showToast('Profile photo updated!');
    updateNavUser();
    updateComposerAvatar();
    renderOwnProfile();
  } catch(e) { showToast('Photo upload failed'); }
}

function showEditProfile() {
  if (!currentProfile) return;
  $('editDisplayName').value = currentProfile.displayName || '';
  $('editBio').value = currentProfile.bio || '';
  $('editProfileModal').classList.add('open');
}

async function saveProfile() {
  const name = $('editDisplayName').value.trim();
  const bio  = $('editBio').value.trim();
  if (!name) return showToast('Name cannot be empty');
  await window.XF.update(`users/${currentUser.uid}`, { displayName: name, bio });
  await window.XF.updateProfile({ displayName: name });
  currentProfile.displayName = name; currentProfile.bio = bio;
  $('editProfileModal').classList.remove('open');
  showToast('Profile updated');
  renderOwnProfile(); updateNavUser();
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════ */
async function renderNotifications() {
  const container = $('notifList');
  if (!container || !currentUser) return;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  const snap = await window.XF.get(`notifications/${currentUser.uid}`);
  const notifs = [];
  if (snap.exists()) snap.forEach(c => notifs.push({ id: c.key, ...c.val() }));
  notifs.sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  if (notifs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.bell}</div><div class="empty-state-title">No notifications yet</div></div>`;
    return;
  }

  container.innerHTML = notifs.map(n => {
    if (n.type === 'connection_request') return `
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="notif-icon">${ICONS.user}</div>
        <div style="flex:1">
          <div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> wants to connect with you</div>
          <div class="notif-time">${timeAgo(n.createdAt)}</div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-primary btn-sm" onclick="acceptConnection('${n.reqId}','${n.fromUid}')">Accept</button>
            <button class="btn btn-outline btn-sm" onclick="declineConnection('${n.reqId}')">Decline</button>
          </div>
        </div>
      </div>`;
    if (n.type === 'connection_accepted') return `
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="notif-icon">${ICONS.check}</div>
        <div style="flex:1">
          <div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> accepted your connection request</div>
          <div class="notif-time">${timeAgo(n.createdAt)}</div>
        </div>
      </div>`;
    return `
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="notif-icon">${ICONS.bell}</div>
        <div style="flex:1">
          <div class="notif-text">${escapeHTML(n.text || 'New notification')}</div>
          <div class="notif-time">${timeAgo(n.createdAt)}</div>
        </div>
      </div>`;
  }).join('');

  notifs.filter(n => !n.read).forEach(n => {
    window.XF.update(`notifications/${currentUser.uid}/${n.id}`, { read: true });
  });
  ['navNotifBadge','mobileNotifBadge'].forEach(id => {
    const b = $(id); if (b) b.style.display = 'none';
  });
}

function startNotifWatch() {
  if (!currentUser) return;
  window.XF.on(`notifications/${currentUser.uid}`, snap => {
    let unread = 0;
    if (snap.exists()) snap.forEach(c => { if (!c.val().read) unread++; });
    ['navNotifBadge','mobileNotifBadge'].forEach(id => {
      const b = $(id); if (b) { b.textContent = unread; b.style.display = unread > 0 ? 'flex' : 'none'; }
    });
  });
}

/* ══════════════════════════════════════════════
   MESSAGES + UNREAD BADGE
══════════════════════════════════════════════ */
function startMsgUnreadWatch() {
  if (!currentUser) return;
  window.XF.on(`connections/${currentUser.uid}`, async snap => {
    if (!snap.exists()) return;
    const uids = Object.keys(snap.val());
    let totalUnread = 0;
    await Promise.all(uids.map(async uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const msgsSnap = await window.XF.get(`dms/${convId}`);
      if (!msgsSnap.exists()) return;
      let unread = 0;
      msgsSnap.forEach(c => {
        const m = c.val();
        if (m.senderUid !== currentUser.uid && !m.read) unread++;
      });
      unreadMsgMap[uid] = unread;
      totalUnread += unread;
    }));
    ['navMsgBadge','mobileMsgBadge'].forEach(id => {
      const b = $(id); if (b) { b.style.display = totalUnread > 0 ? 'flex' : 'none'; }
    });
  });
}

async function renderConversations() {
  if (!requireVerified('messages')) return;
  const container = $('convList');
  if (!container) return;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const connSnap = await window.XF.get(`connections/${currentUser.uid}`);
  if (!connSnap.exists()) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.mail}</div><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">Connect with members to start chatting</div></div>`;
    return;
  }

  const connUids = Object.keys(connSnap.val());
  const profiles = {};
  await Promise.all(connUids.map(async uid => {
    const s = await window.XF.get(`users/${uid}`);
    if (s.exists()) profiles[uid] = s.val();
  }));

  container.innerHTML = connUids.map(uid => {
    const p = profiles[uid];
    if (!p) return '';
    const unread = unreadMsgMap[uid] || 0;
    return `
      <div class="conversation-item ${activeConvUid===uid?'active':''}" onclick="openDMWith('${uid}')">
        ${avatarHTML(p, 'md')}
        <div class="conv-info">
          <div class="conv-name">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div>
          <div class="conv-preview">@${escapeHTML(p.handle||'member')}</div>
        </div>
        ${unread > 0 ? `<span class="conv-unread-badge">${unread}</span>` : ''}
      </div>`;
  }).join('');
}

async function openDMWith(uid) {
  if (!requireVerified('messages')) return;
  if (activePage !== 'messages') showPage('messages');
  activeConvUid = uid;
  const snap = await window.XF.get(`users/${uid}`);
  const partner = snap.exists() ? snap.val() : null;
  const chatArea = $('chatArea');
  if (!chatArea) return;

  chatArea.innerHTML = `
    <div class="chat-header">
      ${avatarHTML(partner, 'md')}
      <div>
        <div style="display:flex;align-items:center;gap:4px;font-weight:700">${escapeHTML(partner?partner.displayName:'Member')}${verifiedBadge(partner&&partner.verified)}</div>
        <div style="font-size:0.8rem;color:var(--text-dim)">@${escapeHTML(partner?partner.handle:'member')}
          ${onlineMap[uid] ? '<span style="color:var(--success);font-size:0.75rem"> · Online</span>' : ''}
        </div>
      </div>
    </div>
    <div id="uploadProgressBar" class="upload-progress" style="width:0;display:none"></div>
    <div id="chatMessages" class="chat-messages"></div>
    <div id="chatImgPreview" class="chat-img-preview" style="display:none">
      <img id="chatImgThumb" src="" alt="">
      <button class="btn btn-outline btn-sm" onclick="clearChatImg()">${ICONS.xmark}</button>
    </div>
    <div class="chat-composer">
      <label class="chat-img-btn" title="Send image" for="chatImageInput">
        ${ICONS.image}
        <input id="chatImageInput" type="file" accept="image/*" style="display:none" onchange="previewChatImage(this)">
      </label>
      <input id="chatInput" class="chat-input" placeholder="Send a message" onkeydown="if(event.key==='Enter'&&!event.shiftKey)sendDM('${uid}')">
      <button class="btn btn-accent" onclick="sendDM('${uid}')">${ICONS.send}</button>
    </div>`;

  if (msgUnsubscribe) msgUnsubscribe();
  const convId = [currentUser.uid, uid].sort().join('_');
  msgUnsubscribe = window.XF.on(`dms/${convId}`, snap => {
    const msgs = [];
    if (snap.exists()) snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
    const el = $('chatMessages');
    if (!el) return;
    el.innerHTML = msgs.map(m => {
      const isMe = m.senderUid === currentUser.uid;
      const ts = m.createdAt ? `<div class="chat-msg-time">${timeAgo(m.createdAt)}</div>` : '';
      if (m.imageURL) {
        return `<div class="chat-msg ${isMe?'me':'them'}"><img src="${m.imageURL}" onclick="window.open('${m.imageURL}','_blank')">${ts}</div>`;
      }
      return `<div class="chat-msg ${isMe?'me':'them'}">${escapeHTML(m.text||'')}${ts}</div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
    // Mark incoming as read
    msgs.filter(m => m.senderUid !== currentUser.uid && !m.read).forEach(m => {
      window.XF.update(`dms/${convId}/${m.id}`, { read: true });
    });
  });

  renderConversations();
}

let chatImageFile = null;
function previewChatImage(input) {
  if (!input.files[0]) return;
  chatImageFile = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    const preview = $('chatImgPreview');
    const thumb = $('chatImgThumb');
    if (preview && thumb) { thumb.src = e.target.result; preview.style.display = 'flex'; }
  };
  reader.readAsDataURL(chatImageFile);
}
function clearChatImg() {
  chatImageFile = null;
  const preview = $('chatImgPreview'); if (preview) preview.style.display = 'none';
  const input = $('chatImageInput'); if (input) input.value = '';
}

async function sendDM(toUid) {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text && !chatImageFile) return;
  input.value = '';
  const convId = [currentUser.uid, toUid].sort().join('_');

  if (chatImageFile) {
    const bar = $('uploadProgressBar');
    if (bar) { bar.style.display = 'block'; bar.style.width = '0'; }
    try {
      const result = await window.XCloud.upload(chatImageFile, 'x_dms', pct => {
        if (bar) bar.style.width = pct + '%';
      });
      clearChatImg();
      if (bar) { bar.style.display = 'none'; bar.style.width = '0'; }
      await window.XF.push(`dms/${convId}`, {
        senderUid: currentUser.uid, imageURL: result.url,
        createdAt: window.XF.ts(), read: false,
      });
    } catch(e) {
      if (bar) bar.style.display = 'none';
      showToast('Image send failed');
    }
    return;
  }

  await window.XF.push(`dms/${convId}`, {
    senderUid: currentUser.uid, text, createdAt: window.XF.ts(), read: false,
  });
}

/* ══════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════ */
async function searchUsers(query, targetId='sidebarSearchResults') {
  const container = $(targetId);
  if (!container) return;
  if (!query || query.length < 2) { container.innerHTML = ''; return; }
  const snap = await window.XF.get('users');
  const results = [];
  if (snap.exists()) {
    snap.forEach(c => {
      const p = c.val();
      if (p.uid === (currentUser&&currentUser.uid)) return;
      const q = query.toLowerCase();
      if ((p.displayName||'').toLowerCase().includes(q) || (p.handle||'').toLowerCase().includes(q)) results.push(p);
    });
  }
  container.innerHTML = results.slice(0,8).map(p => `
    <div class="people-card" onclick="openUserProfile('${p.uid}', event)">
      ${avatarHTML(p, 'md')}
      <div class="people-card-info">
        <div class="people-card-name">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div>
        <div class="people-card-handle">@${escapeHTML(p.handle||'member')}</div>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════
   SUGGESTED MEMBERS (sidebar)
══════════════════════════════════════════════ */
async function loadSuggested() {
  const c = $('suggestedMembers');
  if (!c || !window.XF) return;
  try {
    const snap = await window.XF.get('users');
    const people = [];
    if (snap.exists()) snap.forEach(s => { if (s.key !== (currentUser&&currentUser.uid)) people.push(s.val()); });
    const shown = people.filter(p=>p.verified).slice(0,3).concat(people.filter(p=>!p.verified).slice(0,2));
    if (shown.length === 0) { c.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">No members yet</div>'; return; }
    c.innerHTML = shown.slice(0,4).map(p => `
      <div class="sidebar-item" onclick="openUserProfile('${p.uid}', event)" style="display:flex;align-items:center;gap:10px">
        ${avatarHTML(p,'sm')}
        <div style="min-width:0;flex:1">
          <div style="font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:3px">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div>
          <div style="color:var(--text-dim);font-size:0.78rem">@${escapeHTML(p.handle||'member')}</div>
        </div>
        ${p.uid !== (currentUser&&currentUser.uid) ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();sendConnectionRequest('${p.uid}')" style="font-size:0.75rem;padding:4px 10px">Connect</button>` : ''}
      </div>`).join('');
  } catch(e) {}
}

/* ══════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════ */
async function renderAdminPanel() {
  if (!currentUser || !isAdmin(currentUser.uid)) return;
  const container = $('adminContent');
  if (!container) return;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const snap = await window.XF.get('users');
    const users = [];
    if (snap.exists()) snap.forEach(c => users.push(c.val()));

    const total     = users.length;
    const verified  = users.filter(u => u.verified).length;
    const unverified = total - verified;

    container.innerHTML = `
      <div class="admin-header">
        <span class="admin-badge-pill">Admin</span>
        <span style="font-weight:700;font-size:1rem">Control Panel</span>
      </div>
      <div class="admin-stats">
        <div class="admin-stat-card"><div class="admin-stat-num">${total}</div><div class="admin-stat-label">Total Members</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--success)">${verified}</div><div class="admin-stat-label">Verified</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--text-dim)">${unverified}</div><div class="admin-stat-label">Unverified</div></div>
      </div>
      <div class="admin-search">
        <input class="form-input" type="text" placeholder="Search members by name or handle…" oninput="filterAdminUsers(this.value)" style="border-radius:9999px">
      </div>
      <div id="adminUserList">
        ${renderAdminUserList(users)}
      </div>`;

    // Store full list for filtering
    window._adminUsers = users;
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load users</div></div>';
  }
}

function renderAdminUserList(users) {
  if (users.length === 0) return '<div class="empty-state"><div class="empty-state-desc">No users found</div></div>';
  return users.map(u => {
    const subStatus = u.subscriptionStatus || 'none';
    const subLabel  = subStatus === 'active' ? 'Active' : subStatus === 'expired' ? 'Expired' : 'None';
    const subCls    = subStatus === 'active' ? 'sub-active' : subStatus === 'expired' ? 'sub-expired' : 'sub-none';
    const nextBill  = u.nextBillingDate ? new Date(u.nextBillingDate).toLocaleDateString() : '—';
    return `
      <div class="admin-user-row">
        ${avatarHTML(u, 'sm')}
        <div class="admin-user-info">
          <div class="admin-user-name">${escapeHTML(u.displayName||'Member')}${verifiedBadge(u.verified)}<span class="admin-sub-status ${subCls}">${subLabel}</span></div>
          <div class="admin-user-meta">@${escapeHTML(u.handle||'?')} · ${escapeHTML(u.email||'')} · Next billing: ${nextBill}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          ${u.verified
            ? `<button class="btn btn-danger btn-sm" onclick="adminSetVerified('${u.uid}', false)">Unverify</button>`
            : `<button class="btn btn-accent btn-sm" onclick="adminSetVerified('${u.uid}', true)">Verify</button>`}
        </div>
      </div>`;
  }).join('');
}

function filterAdminUsers(query) {
  const list = $('adminUserList');
  if (!list || !window._adminUsers) return;
  const q = query.toLowerCase();
  const filtered = q.length < 2 ? window._adminUsers :
    window._adminUsers.filter(u =>
      (u.displayName||'').toLowerCase().includes(q) ||
      (u.handle||'').toLowerCase().includes(q) ||
      (u.email||'').toLowerCase().includes(q));
  list.innerHTML = renderAdminUserList(filtered);
}

async function adminSetVerified(uid, state) {
  try {
    const updates = { verified: state };
    if (state) {
      updates.subscriptionStatus = 'active';
      updates.verifiedAt = window.XF.ts();
      updates.nextBillingDate = Date.now() + (30 * 24 * 60 * 60 * 1000);
    } else {
      updates.subscriptionStatus = 'revoked';
      updates.revokedAt = window.XF.ts();
      updates.nextBillingDate = null;
    }
    await window.XF.update(`users/${uid}`, updates);
    showToast(state ? 'User verified!' : 'User unverified');
    renderAdminPanel();
  } catch(e) { showToast('Action failed'); }
}

/* ══════════════════════════════════════════════
   PWA INSTALL BANNER
══════════════════════════════════════════════ */
function checkPwaBanner() {
  const dismissed = localStorage.getItem('xclub_pwa_dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return; // already installed

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const existing = $('pwaBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'pwaBanner';
  banner.className = 'pwa-banner';

  if (deferredPwaPrompt) {
    banner.innerHTML = `
      <div class="pwa-banner-icon">${ICONS.addHome}</div>
      <div class="pwa-banner-text">
        <div class="pwa-banner-title">Add X Club to Home Screen</div>
        <div class="pwa-banner-sub">Access instantly, like a native app</div>
      </div>
      <div class="pwa-banner-actions">
        <button class="btn btn-accent btn-sm" onclick="triggerPwaInstall()">Install</button>
        <div class="pwa-dismiss" onclick="dismissPwaBanner()">Not now</div>
      </div>`;
  } else if (isIOS) {
    banner.innerHTML = `
      <div class="pwa-banner-icon">${ICONS.addHome}</div>
      <div class="pwa-banner-text">
        <div class="pwa-banner-title">Add X Club to Home Screen</div>
        <div class="pwa-ios-hint">${ICONS.share2} Tap Share, then "Add to Home Screen"</div>
        <div class="pwa-dismiss" onclick="dismissPwaBanner()" style="margin-top:6px">Dismiss</div>
      </div>`;
  } else {
    return; // Non-iOS without install prompt — skip
  }

  document.body.appendChild(banner);
}

function dismissPwaBanner() {
  localStorage.setItem('xclub_pwa_dismissed', Date.now().toString());
  const banner = $('pwaBanner');
  if (banner) { banner.classList.add('hidden'); setTimeout(() => banner.remove(), 400); }
}

async function triggerPwaInstall() {
  if (!deferredPwaPrompt) return;
  deferredPwaPrompt.prompt();
  const { outcome } = await deferredPwaPrompt.userChoice;
  deferredPwaPrompt = null;
  dismissPwaBanner();
  if (outcome === 'accepted') showToast('X Club installed!');
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPwaPrompt = e;
});

/* ══════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════ */
function closeModal(id) { $(id) && $(id).classList.remove('open'); }
function openPostModal() {
  if (!requireVerified('post')) return;
  $('newPostModal').classList.add('open');
}

/* ══════════════════════════════════════════════
   EXTRA HELPERS
══════════════════════════════════════════════ */
async function sendReset() {
  const email = $('resetEmail').value.trim();
  if (!email) return showToast('Enter your email');
  try {
    await window.XF.resetPw(email);
    showToast('Reset link sent — check your inbox');
    showPage('login');
  } catch(err) { showToast('Could not send reset link'); }
}

function switchFeedTab(tab, el) {
  feedTab = tab;
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderFeed();
}

async function submitModalPost() {
  const textarea = $('modalPostText');
  const text = textarea.value.trim();
  if (!text) return showToast('Write something first');
  if (!requireVerified('post')) return;
  const btn = document.querySelector('#newPostModal .composer-submit');
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    await window.XF.push('posts', {
      authorUid: currentUser.uid, text, type: 'post',
      createdAt: window.XF.ts(), commentCount: 0, imageURL: '',
    });
    textarea.value = '';
    closeModal('newPostModal');
    showToast('Posted!');
    if (activePage === 'feed') renderFeed();
  } catch(e) { showToast('Failed to post');
  } finally { btn.disabled = false; btn.textContent = 'Post'; }
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.XFire.load();
    window.XF.onAuth(onAuthChange);
  } catch(err) {
    console.error('Firebase failed:', err);
    hideLoader();
    showPage('landing');
  }
});
