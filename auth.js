// auth.js — X Club v7 — Authentication, Paywall, Deep Links & Password Reset
// Load order: 4th
'use strict';

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const email = $('loginEmail').value.trim(), pass = $('loginPass').value, btn = $('loginBtn');
  if (!email || !pass) return showToast('Please fill in all fields');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try { await window.XF.signIn(email, pass); }
  catch (err) { showToast(friendlyError(err.code)); btn.disabled = false; btn.textContent = 'Sign in'; }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = $('regName').value.trim(), email = $('regEmail').value.trim(), pass = $('regPass').value;
  const handle = $('regHandle').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const btn = $('regBtn');
  if (!name || !email || !pass || !handle) return showToast('Please fill in all fields');
  if (pass.length < 8) return showToast('Password must be at least 8 characters');
  if (handle.length < 3) return showToast('Handle must be at least 3 characters');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const hSnap = await window.XF.get('handles/' + handle);
    if (hSnap.exists()) { showToast('@' + handle + ' is already taken'); btn.disabled = false; btn.textContent = 'Create account'; return; }
    const cred = await window.XF.signUp(email, pass);
    await window.XF.updateProfile({ displayName: name });
    await window.XF.set('users/' + cred.user.uid, { uid: cred.user.uid, displayName: name, handle, email, bio: '', photoURL: '', verified: false, followersCount: 0, followingCount: 0, postsCount: 0, joinedAt: window.XF.ts() });
    await window.XF.set('handles/' + handle, cred.user.uid);
    showToast('Welcome to X-Musk Financial Club!');
  } catch (err) { showToast(friendlyError(err.code)); btn.disabled = false; btn.textContent = 'Create account'; }
}

async function handleGoogleAuth() {
  try {
    const cred = await window.XF.googleAuth();
    const snap = await window.XF.get('users/' + cred.user.uid);
    if (!snap.exists()) {
      let handle = (cred.user.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      const hSnap = await window.XF.get('handles/' + handle);
      if (hSnap.exists()) handle = handle + Math.floor(Math.random() * 9000 + 1000);
      await window.XF.set('users/' + cred.user.uid, { uid: cred.user.uid, displayName: cred.user.displayName || 'Member', handle, email: cred.user.email || '', bio: '', photoURL: cred.user.photoURL || '', verified: false, followersCount: 0, followingCount: 0, postsCount: 0, joinedAt: window.XF.ts() });
      await window.XF.set('handles/' + handle, cred.user.uid);
    }
  } catch (err) { showToast(friendlyError(err.code)); }
}

async function handleLogout() {
  await window.XF.signOut(); currentProfile = null; currentUser = null; _pageStack.length = 0; showPage('landing');
}

function friendlyError(code) {
  return ({
    'auth/user-not-found': 'No account found with that email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Incorrect email or password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-email': 'Invalid email address',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
    'auth/network-request-failed': 'Network error — check your connection'
  }[code]) || 'Something went wrong. Please try again.';
}

async function onAuthChange(user) {
  currentUser = user;
  if (user) {
    if (user.email === ADMIN_EMAIL) {
      isAdmin = true;
      const snap = await window.XF.get('users/' + user.uid);
      currentProfile = snap.exists() ? snap.val() : { displayName: 'Admin', uid: user.uid };
      hideLoader(); showPage('admin'); loadAdminUsers(); setTimeout(injectAdminTools, 400); return;
    }
    isAdmin = false;
    const snap = await window.XF.get('users/' + user.uid);
    currentProfile = snap.exists() ? snap.val() : null;
    updateNavUser(); updateComposerAvatar(); loadSuggested(); startNotifWatch(); startMsgWatch();
    updateSidebarVerifyBtn(); _updateMsgRequestBadge();
    const handled = checkProfileDeepLink();
    if (!handled) {
      if (['landing', 'login', 'register'].includes(activePage)) showPage('feed');
      else showPage(activePage);
    }
    setTimeout(loadBizFeed, 1500); setTimeout(runScheduledPosts, 5000);
    checkDeepLink();
  } else {
    isAdmin = false; currentProfile = null; updateNavUser();
    updateSidebarVerifyBtn();
    if (!checkProfileDeepLink()) showPage('landing');
  }
  hideLoader();
}

function updateNavUser() {
  const wrap = $('navUserWrap'); if (!wrap) return;
  if (currentUser && currentProfile) {
    wrap.style.display = 'flex';
    const n = $('navUserName'), h = $('navUserHandle'), a = $('navUserAvatar');
    if (n) n.innerHTML = escapeHTML(currentProfile.displayName || 'Member') + verifiedBadge(currentProfile.verified);
    if (h) h.textContent = '@' + (currentProfile.handle || 'member');
    if (a) a.outerHTML = avatarHTML(currentProfile, 'md').replace('class="avatar', 'id="navUserAvatar" class="avatar');
  } else wrap.style.display = 'none';
}

function updateComposerAvatar() {
  const el = $('composerAvatar');
  if (el && currentProfile) el.outerHTML = avatarHTML(currentProfile, 'md').replace('class="avatar', 'id="composerAvatar" class="avatar');
}

/* ══════════════════════════════════════════════
   PAYWALL
══════════════════════════════════════════════ */
function showPaywall() {
  $('paywallModal').classList.add('open');
  // Update displayed price from Firebase if admin has changed it
  window.XF.get('appConfig').then(cfg => {
    if (cfg.exists() && cfg.val().membershipLabel) {
      const el = document.querySelector('.paywall-price');
      if (el) el.textContent = cfg.val().membershipLabel;
    }
  }).catch(() => {});
}
function closePaywall() { $('paywallModal').classList.remove('open'); }

async function initiatePayment() {
  if (!currentUser || !currentProfile) { showToast('Please sign in first'); return; }
  if (typeof FlutterwaveCheckout === 'undefined') { showToast('Payment system loading — try again'); return; }
  // Read price dynamically from Firebase so admin can update without touching code
  let amount = MEMBERSHIP_PRICE, currency = MEMBERSHIP_CURRENCY;
  try {
    const cfg = await window.XF.get('appConfig');
    if (cfg.exists()) {
      const v = cfg.val();
      if (v.membershipPrice)    amount   = v.membershipPrice;
      if (v.membershipCurrency) currency = v.membershipCurrency;
    }
  } catch (e) { /* fall back to config.js defaults */ }
  FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY, tx_ref: 'XCLUB-' + currentUser.uid + '-' + Date.now(),
    amount, currency, payment_options: 'card,banktransfer,ussd',
    customer: { email: currentUser.email, name: currentProfile.displayName || 'Member' },
    customizations: { title: 'X Club Membership', description: 'Annual verified membership', logo: '' },
    callback: async function (data) {
      if (data.status === 'successful' || data.status === 'completed') {
        try {
          await window.XF.update('users/' + currentUser.uid, { verified: true, verifiedAt: window.XF.ts(), paymentRef: data.transaction_id || data.tx_ref });
          currentProfile.verified = true; closePaywall(); showToast('✦ You are now a verified member!');
          updateNavUser(); renderOwnProfile();
        } catch (err) { showToast('Payment confirmed but update failed — contact support'); }
      } else showToast('Payment was not completed');
    },
    onclose: function () {}
  });
}

/* ══════════════════════════════════════════════
   DEEP LINK  (?post=ID)
══════════════════════════════════════════════ */
function checkDeepLink() {
  const params = new URLSearchParams(window.location.search); const postId = params.get('post');
  if (postId && currentUser) { window.history.replaceState({}, '', window.location.pathname); setTimeout(() => showPage('post-detail', { postId }), 800); }
}

/* ══════════════════════════════════════════════
   RESET PASSWORD
══════════════════════════════════════════════ */
async function sendReset() {
  const email = $('resetEmail').value.trim(); if (!email) return showToast('Enter your email');
  try { await window.XF.resetPw(email); showToast('Reset link sent — check your inbox'); showPage('login'); }
  catch (err) { showToast('Could not send reset link'); }
}

/* ══════════════════════════════════════════════
   PROFILE SHARING DEEP LINK  (?user=HANDLE or ?uid=UID)
══════════════════════════════════════════════ */
function checkProfileDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const handle = params.get('user'); const uid = params.get('uid');
  if (!handle && !uid) return false;
  window.history.replaceState({}, '', window.location.pathname);
  (async () => {
    try {
      let targetUid = uid;
      if (!targetUid && handle) {
        // Use the handles/ index directly — no full user scan needed
        const snap = await window.XF.get('handles/' + handle.toLowerCase());
        targetUid = snap.exists() ? snap.val() : null;
      }
      if (!targetUid) { showToast('Profile not found'); return; }
      if (currentUser && targetUid === currentUser.uid) { showPage('profile'); return; }
      showPage('user-profile', { uid: targetUid });
    } catch (e) { showToast('Could not load profile'); }
  })();
  return true;
}

/* ══════════════════════════════════════════════
   SIDEBAR: hide Get Verified for verified members
══════════════════════════════════════════════ */
function updateSidebarVerifyBtn() {
  const btn = $('sidebarVerifyBtn'); if (!btn) return;
  btn.style.display = (currentUser && currentProfile?.verified) ? 'none' : 'block';
}
