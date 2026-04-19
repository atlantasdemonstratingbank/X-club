// discover.js — X Club v7 — Discover, Search, Connections, Block/Unblock
'use strict';

/* ══════════════════════════════════════════════
   DISCOVER
══════════════════════════════════════════════ */
async function renderDiscover() {
  const container = $('discoverPeople'); if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const snap = await window.XF.get('users'); const people = [];
    const blockedUids = await getBlockedUids();
    if (snap.exists()) snap.forEach(c => { if (c.key !== currentUser?.uid && !blockedUids.has(c.key)) people.push(c.val()); });
    if (people.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⊛</div><div class="empty-state-title">No members yet</div></div>`; return; }
    const myConnSnap = currentUser ? await window.XF.get('connections/' + currentUser.uid) : null;
    const myConns = myConnSnap?.exists() ? myConnSnap.val() : {};
    const reqSnap = currentUser ? await window.XF.get('connectionRequests') : null;
    container.innerHTML = people.map(p => {
      const status = myConns[p.uid] ? 'connected' : (reqSnap?.exists() && reqSnap.val()[`${currentUser?.uid}_${p.uid}`]?.status === 'pending') ? 'pending' : 'none';
      return `<div class="people-card" onclick="openUserProfile('${p.uid}',event)">
        ${avatarHTML(p, 'md')}
        <div class="people-card-info">
          <div class="people-card-name">${escapeHTML(p.displayName || 'Member')}${verifiedBadge(p.verified)}</div>
          <div class="people-card-handle">@${escapeHTML(p.handle || 'member')}</div>
          <div class="people-card-bio">${escapeHTML(p.bio || '')}</div>
        </div>
        <div onclick="event.stopPropagation()">${connectBtnHTML(p.uid, status)}</div>
      </div>`;
    }).join('');
  } catch (err) { container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load members</div></div>'; }
}

function connectBtnHTML(uid, status) {
  if (!currentUser || uid === currentUser.uid) return '';
  if (status === 'connected') return `<button class="btn btn-following btn-sm" onclick="event.stopPropagation();disconnect('${uid}')">Connected</button>`;
  if (status === 'pending') return `<button class="btn btn-outline btn-sm" disabled>Pending</button>`;
  return `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendConnectionRequest('${uid}')">Connect</button>`;
}

async function sendConnectionRequest(toUid) {
  if (!requireVerified('connect with members')) return;
  const reqId = currentUser.uid + '_' + toUid;
  await window.XF.set('connectionRequests/' + reqId, { from: currentUser.uid, to: toUid, status: 'pending', createdAt: window.XF.ts() });
  await window.XF.push('notifications/' + toUid, { type: 'connection_request', fromUid: currentUser.uid, fromName: currentProfile.displayName, reqId, createdAt: window.XF.ts(), read: false });
  showToast('Connection request sent!'); renderDiscover();
}

async function acceptConnection(reqId, fromUid) {
  const myUid = currentUser.uid;
  await window.XF.update('connectionRequests/' + reqId, { status: 'accepted' });
  await window.XF.set('connections/' + myUid + '/' + fromUid, true);
  await window.XF.set('connections/' + fromUid + '/' + myUid, true);
  const myF = (await window.XF.get('users/' + myUid + '/followersCount')).val() || 0;
  const thF = (await window.XF.get('users/' + fromUid + '/followersCount')).val() || 0;
  const myFw = (await window.XF.get('users/' + myUid + '/followingCount')).val() || 0;
  const thFw = (await window.XF.get('users/' + fromUid + '/followingCount')).val() || 0;
  await window.XF.update('users/' + myUid, { followersCount: myF + 1, followingCount: myFw + 1 });
  await window.XF.update('users/' + fromUid, { followersCount: thF + 1, followingCount: thFw + 1 });
  if (currentProfile) { currentProfile.followersCount = myF + 1; currentProfile.followingCount = myFw + 1; }
  await window.XF.push('notifications/' + fromUid, { type: 'connection_accepted', fromUid: myUid, fromName: currentProfile?.displayName || 'Member', createdAt: window.XF.ts(), read: false });
  showToast('Connection accepted!');
  renderNotifications();
}

async function declineConnection(reqId) { await window.XF.update('connectionRequests/' + reqId, { status: 'declined' }); showToast('Request declined'); renderNotifications(); }

async function acceptConnectionFromNotif(reqId, fromUid, btn) {
  const container = btn?.closest('[id^="connBtns_"]');
  if (container) container.innerHTML = '<span style="color:var(--success);font-size:0.85rem;font-weight:600">✓ Connected</span>';
  await acceptConnection(reqId, fromUid);
}

async function acceptConnectionFromProfile(reqId, fromUid, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Connecting…'; }
  await acceptConnection(reqId, fromUid);
  renderUserProfile(fromUid);
}

async function disconnect(uid) {
  if (!currentUser) return;
  await window.XF.remove('connections/' + currentUser.uid + '/' + uid);
  await window.XF.remove('connections/' + uid + '/' + currentUser.uid);
  const myF = (await window.XF.get('users/' + currentUser.uid + '/followersCount')).val() || 0;
  const myFw = (await window.XF.get('users/' + currentUser.uid + '/followingCount')).val() || 0;
  await window.XF.update('users/' + currentUser.uid, { followersCount: Math.max(0, myF - 1), followingCount: Math.max(0, myFw - 1) });
  if (currentProfile) { currentProfile.followersCount = Math.max(0, myF - 1); currentProfile.followingCount = Math.max(0, myFw - 1); }
  showToast('Disconnected'); renderDiscover();
}

/* ══════════════════════════════════════════════
   BLOCK USER
══════════════════════════════════════════════ */
async function blockUser(uid, displayName) {
  if (!currentUser || uid === currentUser.uid) return;
  if (!confirm(`Block ${displayName || 'this user'}? They won't be able to see your content and you won't see theirs.`)) return;
  try {
    await window.XF.set('blocks/' + currentUser.uid + '/' + uid, { blockedAt: window.XF.ts(), displayName: displayName || '' });
    await window.XF.remove('connections/' + currentUser.uid + '/' + uid);
    await window.XF.remove('connections/' + uid + '/' + currentUser.uid);
    showToast('User blocked'); goBack();
  } catch (e) { showToast('Could not block user'); }
}

async function unblockUser(uid, displayName) {
  if (!currentUser) return;
  try { await window.XF.remove('blocks/' + currentUser.uid + '/' + uid); showToast(displayName + ' unblocked'); }
  catch (e) { showToast('Could not unblock'); }
}

async function getBlockedUids() {
  if (!currentUser) return new Set();
  try {
    const snap = await window.XF.get('blocks/' + currentUser.uid);
    return snap.exists() ? new Set(Object.keys(snap.val())) : new Set();
  } catch (e) { return new Set(); }
}

async function isBlocked(uid) {
  if (!currentUser) return false;
  try { const s = await window.XF.get('blocks/' + currentUser.uid + '/' + uid); return s.exists(); }
  catch (e) { return false; }
}

async function searchUsers(query) {
  const discoverContainer = $('searchResults');
  const sidebarContainer = $('sidebarSearchResults');
  const containers = [discoverContainer, sidebarContainer].filter(Boolean);
  if (!query || query.length < 2) { containers.forEach(c => c.innerHTML = ''); return; }
  const snap = await window.XF.get('users'); const results = [];
  if (snap.exists()) {
    snap.forEach(c => {
      const p = c.val(); if (p.uid === currentUser?.uid) return;
      const q = query.toLowerCase();
      if ((p.displayName || '').toLowerCase().includes(q) || (p.handle || '').toLowerCase().includes(q)) results.push(p);
    });
  }
  const html = results.slice(0, 8).map(p => `<div class="people-card" onclick="openUserProfile('${p.uid}',event)">${avatarHTML(p, 'sm')}<div class="people-card-info"><div class="people-card-name">${escapeHTML(p.displayName || 'Member')}${verifiedBadge(p.verified)}</div><div class="people-card-handle">@${escapeHTML(p.handle || 'member')}</div></div></div>`).join('');
  containers.forEach(c => c.innerHTML = html);
}
