/* app.js — X Club v3 */
'use strict';

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let currentUser   = null;
let currentProfile = null;   // full profile from DB
let activePage    = 'feed';
let feedTab       = 'for-you';
let profileTab    = 'posts';
let activeConvUid = null;
let msgUnsubscribe = null;

const MEMBERSHIP_PRICE = 1999;
const MEMBERSHIP_CURRENCY = 'EUR';
const FLW_PUBLIC_KEY = 'FLWPUBK-9b3e74ad491f4e5e52d93bd09e3da203-X';

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function $(id) { return document.getElementById(id); }
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
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
  if (profile && profile.photoURL) {
    return `<img class="avatar avatar-${size}" src="${profile.photoURL}" alt="${profile.displayName||''}">`;
  }
  const initials = (profile && profile.displayName) ? profile.displayName.charAt(0).toUpperCase() : '?';
  return `<div class="avatar avatar-${size}">${initials}</div>`;
}
function verifiedBadge(verified, lg=false) {
  if (!verified) return '';
  const cls = lg ? 'verified-badge lg' : 'verified-badge';
  return '<span class="' + cls + '" title="Verified Member">&#10003;</span>';
}
function showToast(msg) {
  const c = $('toastContainer');
  const t = el('div', 'toast', msg);
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
function requireVerified(action) {
  if (!currentUser) { showPage('login'); return false; }
  if (!currentProfile || !currentProfile.verified) {
    showPaywall(action);
    return false;
  }
  return true;
}

/* ══════════════════════════════════════════════
   APP LOADER
══════════════════════════════════════════════ */
function hideLoader() {
  const l = $('appLoader');
  if (l) {
    l.classList.add('gone');
    setTimeout(() => l.remove(), 600);
  }
  $('app').classList.add('visible');
}

/* ══════════════════════════════════════════════
   PAGE ROUTING
══════════════════════════════════════════════ */
function showPage(name, opts={}) {
  if (name === 'feed' && !currentUser) { name = 'landing'; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = $('page-' + name);
  if (pg) pg.classList.add('active');

  activePage = name;
  updateNavActive();
  window.scrollTo(0, 0);

  // Render on navigate
  if (name === 'feed')          renderFeed();
  if (name === 'discover')      renderDiscover();
  if (name === 'notifications') renderNotifications();
  if (name === 'messages')      renderConversations();
  if (name === 'profile')       renderOwnProfile();
  if (name === 'user-profile')  renderUserProfile(opts.uid);
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
  const name  = $('regName').value.trim();
  const email = $('regEmail').value.trim();
  const pass  = $('regPass').value;
  const handle = $('regHandle').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const btn   = $('regBtn');
  if (!name || !email || !pass || !handle) return showToast('Please fill in all fields');
  if (pass.length < 8) return showToast('Password must be at least 8 characters');
  if (handle.length < 3) return showToast('Handle must be at least 3 characters');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const cred = await window.XF.signUp(email, pass);
    await window.XF.updateProfile({ displayName: name });
    await window.XF.set(`users/${cred.user.uid}`, {
      uid: cred.user.uid,
      displayName: name,
      handle: handle,
      email: email,
      bio: '',
      photoURL: '',
      verified: false,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
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
        uid: cred.user.uid,
        displayName: cred.user.displayName || 'Member',
        handle: handle,
        email: cred.user.email,
        bio: '',
        photoURL: cred.user.photoURL || '',
        verified: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        joinedAt: window.XF.ts(),
      });
    }
  } catch(err) {
    showToast(friendlyError(err.code));
  }
}

async function handleLogout() {
  await window.XF.signOut();
  currentProfile = null;
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
  };
  return m[code] || 'Something went wrong. Please try again.';
}

async function onAuthChange(user) {
  currentUser = user;
  if (user) {
    // Load profile
    const snap = await window.XF.get(`users/${user.uid}`);
    currentProfile = snap.exists() ? snap.val() : null;
    updateNavUser();
    if (activePage === 'landing' || activePage === 'login' || activePage === 'register') {
      showPage('feed');
    } else {
      showPage(activePage);
    }
  } else {
    updateNavUser();
    showPage('landing');
  }
  hideLoader();
}

/* ══════════════════════════════════════════════
   NAV USER INFO
══════════════════════════════════════════════ */
function updateNavUser() {
  const wrap = $('navUserWrap');
  if (!wrap) return;
  if (currentUser && currentProfile) {
    wrap.style.display = 'flex';
    const nameEl = $('navUserName');
    const handleEl = $('navUserHandle');
    const avatarEl = $('navUserAvatar');
    if (nameEl) nameEl.innerHTML = (currentProfile.displayName || 'Member') + verifiedBadge(currentProfile.verified);
    if (handleEl) handleEl.textContent = '@' + (currentProfile.handle || 'member');
    if (avatarEl) avatarEl.outerHTML = avatarHTML(currentProfile, 'md').replace('class="avatar', 'id="navUserAvatar" class="avatar');
  } else {
    wrap.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════
   PAYWALL
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
  FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY,
    tx_ref: 'XCLUB-' + currentUser.uid + '-' + Date.now(),
    amount: MEMBERSHIP_PRICE,
    currency: MEMBERSHIP_CURRENCY,
    payment_options: 'card,banktransfer',
    customer: {
      email: currentUser.email,
      name:  currentProfile.displayName || 'Member',
    },
    customizations: {
      title:       'X Club Membership',
      description: 'Annual verified membership — full platform access',
      logo:        '',
    },
    callback: async function(data) {
      if (data.status === 'successful' || data.status === 'completed') {
        try {
          await window.XF.update(`users/${currentUser.uid}`, {
            verified: true,
            verifiedAt: window.XF.ts(),
            paymentRef: data.transaction_id,
          });
          currentProfile.verified = true;
          closePaywall();
          showToast('🎉 You are now a verified member!');
          updateNavUser();
        } catch(err) {
          showToast('Payment confirmed but profile update failed — contact support');
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
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  try {
    const snap = await window.XF.get('posts');
    const posts = [];
    if (snap.exists()) {
      snap.forEach(c => posts.push({ id: c.key, ...c.val() }));
      posts.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    }

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📰</div>
          <div class="empty-state-title">Nothing here yet</div>
          <div class="empty-state-desc">Be the first to post something</div>
        </div>`;
      return;
    }

    // Load author profiles in batch
    const uids = [...new Set(posts.map(p => p.authorUid))];
    const profiles = {};
    await Promise.all(uids.map(async uid => {
      const s = await window.XF.get(`users/${uid}`);
      if (s.exists()) profiles[uid] = s.val();
    }));

    container.innerHTML = posts.map(p => postHTML(p, profiles[p.authorUid])).join('');
  } catch(err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load posts</div></div>';
  }
}

function postHTML(post, author) {
  const isLiked = currentUser && post.likes && post.likes[currentUser.uid];
  const likeCount = post.likes ? Object.keys(post.likes).length : 0;
  const commentCount = post.commentCount || 0;
  const isEvent = post.type === 'event';

  let mediaHTML = '';
  if (post.imageURL) {
    mediaHTML = `<img class="post-image" src="${post.imageURL}" alt="Post image" loading="lazy">`;
  }
  if (isEvent) {
    mediaHTML += `
      <div class="post-event-card">
        <span class="post-event-badge ${post.eventPrivate ? 'badge-private' : 'badge-public'}">
          ${post.eventPrivate ? '🔒 Private Event' : '🌐 Open Event'}
        </span>
        <div class="post-event-title">${post.eventTitle || ''}</div>
        <div class="post-event-meta">
          ${post.eventDate ? `<span>📅 ${post.eventDate}</span>` : ''}
          ${post.eventTime ? `<span>🕐 ${post.eventTime}</span>` : ''}
          ${post.eventLocation ? `<span>📍 ${post.eventLocation}</span>` : ''}
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
          <span class="post-name">${author ? author.displayName : 'Unknown'}</span>
          ${verifiedBadge(author && author.verified)}
          <span class="post-handle">@${author ? author.handle : 'unknown'}</span>
          <span class="post-time">· ${timeAgo(post.createdAt)}</span>
        </div>
        <div class="post-text">${escapeHTML(post.text || '')}</div>
        ${mediaHTML}
        <div class="post-actions" onclick="event.stopPropagation()">
          <div class="post-action comment" onclick="openPost('${post.id}', event)">
            <span>💬</span> ${commentCount > 0 ? commentCount : ''}
          </div>
          <div class="post-action like ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
            <span>${isLiked ? '❤️' : '🤍'}</span> ${likeCount > 0 ? likeCount : ''}
          </div>
          <div class="post-action share" onclick="sharePost('${post.id}')">
            <span>🔗</span>
          </div>
        </div>
      </div>
    </div>`;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Submit post ── */
async function submitPost() {
  if (!requireVerified('post')) return;
  const textarea = $('postText');
  const text = textarea.value.trim();
  const imageInput = $('postImageInput');
  const isEvent = $('postTypeEvent') && $('postTypeEvent').classList.contains('active');

  if (!text && !imageInput.files[0] && !isEvent) return showToast('Write something first');

  const btn = $('postSubmitBtn');
  btn.disabled = true; btn.textContent = 'Posting…';

  try {
    let imageURL = '';
    if (imageInput.files[0]) {
      imageURL = await uploadImageBase64(imageInput.files[0]);
    }

    const postData = {
      authorUid:  currentUser.uid,
      text:       text,
      imageURL:   imageURL,
      type:       isEvent ? 'event' : 'post',
      createdAt:  window.XF.ts(),
      commentCount: 0,
    };

    if (isEvent) {
      postData.eventTitle    = $('eventTitle').value.trim();
      postData.eventDate     = $('eventDate').value;
      postData.eventTime     = $('eventTime').value;
      postData.eventLocation = $('eventLocation').value.trim();
      postData.eventPrivate  = $('eventPrivate').checked;
    }

    await window.XF.push('posts', postData);
    await window.XF.update(`users/${currentUser.uid}`, {
      postsCount: (currentProfile.postsCount || 0) + 1
    });
    currentProfile.postsCount = (currentProfile.postsCount || 0) + 1;

    textarea.value = '';
    imageInput.value = '';
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

async function uploadImageBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Upload to imgBB (free image hosting) or use Cloudinary if configured
        // For now store as data URL (for demo — in production use proper storage)
        resolve(e.target.result);
      } catch(err) { reject(err); }
    };
    reader.readAsDataURL(file);
  });
}

function previewPostImage(input) {
  const preview = $('postImagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div class="img-preview-wrap">
          <img src="${e.target.result}">
          <div class="img-preview-remove" onclick="removePostImage()">✕</div>
        </div>`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removePostImage() {
  $('postImageInput').value = '';
  $('postImagePreview').innerHTML = '';
}

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
  const uid = currentUser.uid;
  const snap = await window.XF.get(`posts/${postId}/likes/${uid}`);
  if (snap.exists()) {
    await window.XF.remove(`posts/${postId}/likes/${uid}`);
    el.classList.remove('liked');
    el.querySelector('span').textContent = '🤍';
    const c = parseInt(el.textContent.replace(/\D/g,'')) || 1;
    el.innerHTML = `<span>🤍</span> ${c > 1 ? c-1 : ''}`;
  } else {
    await window.XF.set(`posts/${postId}/likes/${uid}`, true);
    el.classList.add('liked');
    const c = parseInt(el.textContent.replace(/\D/g,'')) || 0;
    el.innerHTML = `<span>❤️</span> ${c+1}`;
  }
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
    <div class="comment-composer" style="padding:12px 16px;border-top:1px solid var(--border);background:var(--bg);position:sticky;bottom:0">
      ${avatarHTML(currentProfile, 'sm')}
      <input id="commentInput" class="comment-input" placeholder="Post your reply" style="flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:0.95rem;padding:0 12px">
      <button class="btn btn-accent btn-sm" onclick="submitComment('${postId}')">Reply</button>
    </div>`;

  modal.classList.add('open');
  loadComments(postId);
}

async function loadComments(postId) {
  const area = $('commentsArea');
  if (!area) return;
  area.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
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

  area.innerHTML = '<div class="comments-section">' +
    comments.map(c => {
      const a = profiles[c.authorUid];
      return `
        <div class="comment">
          ${avatarHTML(a, 'sm')}
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-name">${a ? a.displayName : 'Unknown'}</span>
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
    authorUid: currentUser.uid,
    text: text,
    createdAt: window.XF.ts(),
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
   DISCOVER (PEOPLE)
══════════════════════════════════════════════ */
async function renderDiscover() {
  const container = $('discoverPeople');
  if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const snap = await window.XF.get('users');
    const people = [];
    if (snap.exists()) snap.forEach(c => { if (c.key !== (currentUser && currentUser.uid)) people.push(c.val()); });

    if (people.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">No members yet</div></div>`;
      return;
    }

    // Check connections
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
            <div class="people-card-name">${p.displayName || 'Member'}${verifiedBadge(p.verified)}</div>
            <div class="people-card-handle">@${p.handle || 'member'}</div>
            <div class="people-card-bio">${p.bio || ''}</div>
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
  if (status === 'pending') return `<button class="btn btn-outline btn-sm" disabled>Pending</button>`;
  return `<button class="btn btn-primary btn-sm" onclick="sendConnectionRequest('${uid}')">Connect</button>`;
}

async function sendConnectionRequest(toUid) {
  if (!requireVerified('connect with members')) return;
  const reqId = `${currentUser.uid}_${toUid}`;
  await window.XF.set(`connectionRequests/${reqId}`, {
    from: currentUser.uid,
    to: toUid,
    status: 'pending',
    createdAt: window.XF.ts(),
  });
  // Notify
  await window.XF.push(`notifications/${toUid}`, {
    type: 'connection_request',
    fromUid: currentUser.uid,
    fromName: currentProfile.displayName,
    reqId: reqId,
    createdAt: window.XF.ts(),
    read: false,
  });
  showToast('Connection request sent!');
  renderDiscover();
}

async function acceptConnection(reqId, fromUid) {
  const myUid = currentUser.uid;
  await window.XF.update(`connectionRequests/${reqId}`, { status: 'accepted' });
  await window.XF.set(`connections/${myUid}/${fromUid}`, true);
  await window.XF.set(`connections/${fromUid}/${myUid}`, true);
  // Update follower counts
  const mySnap = await window.XF.get(`users/${myUid}/followersCount`);
  const theirSnap = await window.XF.get(`users/${fromUid}/followersCount`);
  await window.XF.set(`users/${myUid}/followersCount`, ((mySnap.val()||0)+1));
  await window.XF.set(`users/${fromUid}/followersCount`, ((theirSnap.val()||0)+1));
  currentProfile.followersCount = (currentProfile.followersCount||0)+1;
  // Notify sender
  await window.XF.push(`notifications/${fromUid}`, {
    type: 'connection_accepted',
    fromUid: myUid,
    fromName: currentProfile.displayName,
    createdAt: window.XF.ts(),
    read: false,
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
  if (uid === (currentUser && currentUser.uid)) {
    showPage('profile');
    return;
  }
  showPage('user-profile', { uid });
}

async function renderUserProfile(uid) {
  const container = $('userProfileContent');
  if (!container || !uid) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
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
            ${connStatus === 'connected' ? `<button class="btn btn-outline btn-sm" onclick="openDMWith('${uid}')">Message</button>` : ''}
          </div>
        </div>
        <div class="profile-name">${profile.displayName || 'Member'}${verifiedBadge(profile.verified, true)}</div>
        <div class="profile-handle">@${profile.handle || 'member'}</div>
        ${profile.bio ? `<div class="profile-bio">${escapeHTML(profile.bio)}</div>` : ''}
        <div class="profile-stats">
          <div class="profile-stat"><strong>${profile.followersCount||0}</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong>${profile.followingCount||0}</strong> <span>Following</span></div>
          <div class="profile-stat"><strong>${profile.postsCount||0}</strong> <span>Posts</span></div>
        </div>
      </div>
      <div class="profile-tabs">
        <div class="profile-tab active">Posts</div>
      </div>
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

  container.innerHTML = `
    <div class="profile-banner"><div style="width:100%;height:100%;background:var(--bg-3)"></div></div>
    <div class="profile-info-section">
      <div class="profile-name-row">
        <div class="profile-avatar-wrap">${avatarHTML(currentProfile, 'xl')}</div>
        <button class="btn btn-outline btn-sm" onclick="showEditProfile()">Edit profile</button>
      </div>
      <div class="profile-name">${currentProfile.displayName||'Member'}${verifiedBadge(currentProfile.verified, true)}</div>
      <div class="profile-handle">@${currentProfile.handle||'member'}</div>
      ${currentProfile.bio ? `<div class="profile-bio">${escapeHTML(currentProfile.bio)}</div>` : '<div class="profile-bio text-dim">No bio yet</div>'}
      ${!currentProfile.verified ? `
        <div style="margin:12px 0">
          <button class="btn btn-accent" onclick="showPaywall()">✓ Get Verified — €1,999/year</button>
        </div>` : ''}
      <div class="profile-stats">
        <div class="profile-stat"><strong>${currentProfile.followersCount||0}</strong> <span>Followers</span></div>
        <div class="profile-stat"><strong>${currentProfile.followingCount||0}</strong> <span>Following</span></div>
        <div class="profile-stat"><strong>${currentProfile.postsCount||0}</strong> <span>Posts</span></div>
      </div>
    </div>
    <div class="profile-tabs">
      <div class="profile-tab active">Posts</div>
    </div>
    <div>
      ${posts.length === 0
        ? '<div class="empty-state"><div class="empty-state-desc">No posts yet — share something!</div></div>'
        : posts.map(p => postHTML(p, currentProfile)).join('')}
    </div>`;
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
  await window.XF.update(`users/${currentUser.uid}`, { displayName: name, bio: bio });
  await window.XF.updateProfile({ displayName: name });
  currentProfile.displayName = name;
  currentProfile.bio = bio;
  $('editProfileModal').classList.remove('open');
  showToast('Profile updated');
  renderOwnProfile();
  updateNavUser();
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════ */
async function renderNotifications() {
  const container = $('notifList');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const snap = await window.XF.get(`notifications/${currentUser.uid}`);
  const notifs = [];
  if (snap.exists()) snap.forEach(c => notifs.push({ id: c.key, ...c.val() }));
  notifs.sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  if (notifs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications yet</div></div>`;
    return;
  }

  container.innerHTML = notifs.map(n => {
    if (n.type === 'connection_request') {
      return `
        <div class="notif-item ${n.read?'':'unread'}">
          <div class="notif-icon">👤</div>
          <div style="flex:1">
            <div class="notif-text"><strong>${n.fromName}</strong> wants to connect with you</div>
            <div class="notif-time">${timeAgo(n.createdAt)}</div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-primary btn-sm" onclick="acceptConnection('${n.reqId}','${n.fromUid}')">Accept</button>
              <button class="btn btn-outline btn-sm" onclick="declineConnection('${n.reqId}')">Decline</button>
            </div>
          </div>
        </div>`;
    }
    if (n.type === 'connection_accepted') {
      return `
        <div class="notif-item ${n.read?'':'unread'}">
          <div class="notif-icon">🤝</div>
          <div style="flex:1">
            <div class="notif-text"><strong>${n.fromName}</strong> accepted your connection request</div>
            <div class="notif-time">${timeAgo(n.createdAt)}</div>
          </div>
        </div>`;
    }
    return `
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="notif-icon">🔔</div>
        <div style="flex:1">
          <div class="notif-text">${n.text || 'New notification'}</div>
          <div class="notif-time">${timeAgo(n.createdAt)}</div>
        </div>
      </div>`;
  }).join('');

  // Mark all read
  notifs.filter(n => !n.read).forEach(n => {
    window.XF.update(`notifications/${currentUser.uid}/${n.id}`, { read: true });
  });
  $('navNotifBadge') && ($('navNotifBadge').style.display = 'none');
}

async function checkUnreadNotifications() {
  if (!currentUser) return;
  const snap = await window.XF.get(`notifications/${currentUser.uid}`);
  let unread = 0;
  if (snap.exists()) snap.forEach(c => { if (!c.val().read) unread++; });
  const badge = $('navNotifBadge');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }
}

/* ══════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════ */
async function renderConversations() {
  if (!requireVerified('messages')) return;
  const container = $('convList');
  if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  // Get all connections
  const connSnap = await window.XF.get(`connections/${currentUser.uid}`);
  if (!connSnap.exists()) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">Connect with members to start chatting</div></div>`;
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
    const convId = [currentUser.uid, uid].sort().join('_');
    return `
      <div class="conversation-item ${activeConvUid===uid?'active':''}" onclick="openDMWith('${uid}')">
        ${avatarHTML(p, 'md')}
        <div class="conv-info">
          <div class="conv-name">${p.displayName||'Member'}${verifiedBadge(p.verified)}</div>
          <div class="conv-preview">@${p.handle||'member'}</div>
        </div>
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
        <div style="display:flex;align-items:center;gap:4px;font-weight:700">${partner?partner.displayName:'Member'}${verifiedBadge(partner&&partner.verified)}</div>
        <div style="font-size:0.8rem;color:var(--text-dim)">@${partner?partner.handle:'member'}</div>
      </div>
    </div>
    <div id="chatMessages" class="chat-messages"></div>
    <div class="chat-composer">
      <input id="chatInput" class="chat-input" placeholder="Send a message" onkeydown="if(event.key==='Enter')sendDM('${uid}')">
      <button class="btn btn-accent" onclick="sendDM('${uid}')">Send</button>
    </div>`;

  if (msgUnsubscribe) msgUnsubscribe();
  const convId = [currentUser.uid, uid].sort().join('_');
  msgUnsubscribe = window.XF.on(`dms/${convId}`, snap => {
    const msgs = [];
    if (snap.exists()) snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
    const el = $('chatMessages');
    if (!el) return;
    el.innerHTML = msgs.map(m => `
      <div class="chat-msg ${m.senderUid === currentUser.uid ? 'me' : 'them'}">${escapeHTML(m.text||'')}</div>
    `).join('');
    el.scrollTop = el.scrollHeight;
  });

  renderConversations();
}

async function sendDM(toUid) {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const convId = [currentUser.uid, toUid].sort().join('_');
  await window.XF.push(`dms/${convId}`, {
    senderUid: currentUser.uid,
    text: text,
    createdAt: window.XF.ts(),
  });
}

/* ══════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════ */
async function searchUsers(query) {
  if (!query || query.length < 2) { $('searchResults').innerHTML = ''; return; }
  const snap = await window.XF.get('users');
  const results = [];
  if (snap.exists()) {
    snap.forEach(c => {
      const p = c.val();
      if (p.uid === (currentUser&&currentUser.uid)) return;
      const q = query.toLowerCase();
      if ((p.displayName||'').toLowerCase().includes(q) || (p.handle||'').toLowerCase().includes(q)) {
        results.push(p);
      }
    });
  }
  const container = $('searchResults');
  if (!container) return;
  container.innerHTML = results.slice(0,8).map(p => `
    <div class="people-card" onclick="openUserProfile('${p.uid}', event)">
      ${avatarHTML(p, 'md')}
      <div class="people-card-info">
        <div class="people-card-name">${p.displayName||'Member'}${verifiedBadge(p.verified)}</div>
        <div class="people-card-handle">@${p.handle||'member'}</div>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════ */
function closeModal(id) { $(id).classList.remove('open'); }
function openPostModal() {
  if (!requireVerified('post')) return;
  $('newPostModal').classList.add('open');
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
