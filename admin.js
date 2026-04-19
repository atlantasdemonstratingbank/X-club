// admin.js — X Club v7 — Admin Panel, User Management, Stats, Scheduled Posts
'use strict';

/* ══════════════════════════════════════════════
   ADMIN TABS
══════════════════════════════════════════════ */
function switchAdminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active')); el.classList.add('active');
  $('adminTabUsers').style.display = tab === 'users' ? 'block' : 'none';
  $('adminTabPosts').style.display = tab === 'posts' ? 'block' : 'none';
  $('adminTabStats').style.display = tab === 'stats' ? 'block' : 'none';
  if (tab === 'stats') { loadAdminStats(); loadScheduledPostsAdmin(); }
  if (tab === 'posts') { adminLoadPosts(); }
}

/* ══════════════════════════════════════════════
   USER MANAGEMENT
══════════════════════════════════════════════ */
async function loadAdminUsers() {
  const container = $('adminUserList'); if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const snap = await window.XF.get('users'); allUsersCache = [];
    if (snap.exists()) snap.forEach(c => { const v = c.val(); if (v && typeof v === 'object') allUsersCache.push({ id: c.key, uid: v.uid || c.key, ...v }); });
    allUsersCache.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));
    const unreadMap = {};
    await Promise.all(allUsersCache.map(async u => {
      try {
        const dmsSnap = await window.XF.get('dms');
        if (!dmsSnap.exists()) return;
        let count = 0;
        dmsSnap.forEach(conv => {
          if (!conv.key.includes(u.uid)) return;
          conv.forEach(msg => { const m = msg.val(); if (m.senderUid !== u.uid && (!m.readBy || !m.readBy[u.uid])) count++; });
        });
        if (count > 0) unreadMap[u.uid] = count;
      } catch (e) {}
    }));
    renderAdminUsers(allUsersCache, unreadMap);
    const ce = $('adminUserCount'); if (ce) ce.textContent = allUsersCache.length + ' members';
  } catch (err) { container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load users</div></div>'; }
}

function renderAdminUsers(users, unreadMap = {}) {
  const container = $('adminUserList'); if (!container) return;
  if (users.length === 0) { container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">No users found</div></div>'; return; }
  container.innerHTML = users.map(u => {
    const unread = unreadMap[u.uid] || 0;
    return `
    <div class="admin-user-card" id="adminCard-${u.uid}">
      ${avatarHTML(u, 'md')}
      <div class="admin-user-info">
        <div class="admin-user-name">${escapeHTML(u.displayName || 'Member')} ${u.verified ? '<span style="color:var(--accent);font-size:0.8rem">✓ Verified</span>' : '<span style="color:var(--text-muted);font-size:0.8rem">Unverified</span>'}${unread > 0 ? `<span style="background:var(--accent);color:#fff;font-size:0.7rem;padding:1px 7px;border-radius:9999px;margin-left:6px">${unread} unread msg${unread > 1 ? 's' : ''}</span>` : ''}</div>
        <div class="admin-user-meta">@${escapeHTML(u.handle || '?')} · ${escapeHTML(u.email || '')} · ${formatCount(u.followersCount || 0)} followers</div>
      </div>
      <div class="admin-user-actions">
        <input class="admin-followers-input" id="flwInput-${u.uid}" type="number" value="${u.followersCount || 0}" min="0" placeholder="Followers">
        <button class="btn btn-accent btn-sm" onclick="adminSetFollowers('${u.uid}')">Set</button>
        ${u.verified ? `<button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="adminToggleVerify('${u.uid}',false)">Unverify</button>` : `<button class="btn btn-sm" style="background:var(--success);color:#fff" onclick="adminToggleVerify('${u.uid}',true)">Verify</button>`}
        <button class="btn btn-sm btn-danger" onclick="adminDeleteUser('${u.uid}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function adminSearchUsers(query) {
  if (!query) { renderAdminUsers(allUsersCache); return; }
  const q = query.toLowerCase();
  renderAdminUsers(allUsersCache.filter(u => (u.displayName || '').toLowerCase().includes(q) || (u.handle || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)));
}

async function adminSetFollowers(uid) {
  const input = $('flwInput-' + uid); const val = parseInt(input.value);
  if (isNaN(val) || val < 0) return showToast('Enter a valid number');
  try { await window.XF.update('users/' + uid, { followersCount: val }); const u = allUsersCache.find(x => x.uid === uid); if (u) u.followersCount = val; showToast('Followers updated!'); }
  catch (err) { showToast('Failed to update followers'); }
}

async function adminToggleVerify(uid, verify) {
  try {
    await window.XF.update('users/' + uid, { verified: verify, ...(verify ? { verifiedAt: window.XF.ts() } : { verifiedAt: null }) });
    const u = allUsersCache.find(x => x.uid === uid); if (u) u.verified = verify;
    renderAdminUsers(allUsersCache); showToast(verify ? '✓ User verified!' : 'User unverified');
  } catch (err) { showToast('Failed to update verification'); }
}

async function adminDeleteUser(uid) {
  if (!confirm('Delete this user and all their data? Cannot be undone.')) return;
  try {
    await window.XF.remove('users/' + uid); await window.XF.remove('notifications/' + uid); await window.XF.remove('connections/' + uid);
    allUsersCache = allUsersCache.filter(u => u.uid !== uid); renderAdminUsers(allUsersCache); showToast('User deleted');
  } catch (err) { showToast('Failed to delete user'); }
}

/* ══════════════════════════════════════════════
   STATS
══════════════════════════════════════════════ */
async function loadAdminStats() {
  try {
    const us = await window.XF.get('users'), ps = await window.XF.get('posts');
    let total = 0, verified = 0, posts = 0;
    if (us.exists()) us.forEach(c => { total++; if (c.val().verified) verified++; });
    if (ps.exists()) ps.forEach(() => posts++);
    $('statTotalUsers').textContent = total; $('statVerified').textContent = verified; $('statPosts').textContent = posts;
  } catch (err) {}
}

/* ══════════════════════════════════════════════
   SCHEDULED POSTS (ADMIN VIEW)
══════════════════════════════════════════════ */
async function loadScheduledPostsAdmin() {
  const statsTab = $('adminTabStats'); if (!statsTab) return;
  if (!$('scheduledPostsList')) {
    const s = document.createElement('div'); s.style.cssText = 'margin-top:20px';
    s.innerHTML = `<div class="admin-section-title" style="margin-bottom:10px">◷ Scheduled Posts Queue</div><div id="scheduledPostsList"></div>`;
    statsTab.appendChild(s);
  }
  const container = $('scheduledPostsList'); if (!container) return;
  container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">Loading…</div>';
  try {
    const snap = await window.XF.get('scheduledPosts'); if (!snap.exists()) { container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">No scheduled posts</div>'; return; }
    const all = Object.entries(snap.val()).filter(([, p]) => p.status === 'scheduled');
    if (!all.length) { container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">No pending scheduled posts</div>'; return; }
    all.sort(([, a], [, b]) => a.fireAt - b.fireAt);
    container.innerHTML = all.map(([key, p]) => `<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;font-size:0.83rem"><div style="font-weight:600;margin-bottom:4px">@${escapeHTML(p.handle || '?')} · <span style="color:var(--accent)">◷ ${new Date(p.fireAt).toLocaleString()}</span></div><div style="color:var(--text-dim);margin-bottom:6px">${escapeHTML(p.text)}</div><button class="btn btn-outline btn-sm" style="font-size:0.75rem;color:var(--danger)" onclick="cancelScheduled('${key}')">Cancel</button></div>`).join('');
  } catch (e) { container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">Could not load</div>'; }
}

async function cancelScheduled(key) { await window.XF.set('scheduledPosts/' + key + '/status', 'cancelled'); showToast('Scheduled post cancelled'); loadScheduledPostsAdmin(); }

/* ══════════════════════════════════════════════
   ADMIN TOOLS INJECTION (Keys + Claude Engineer)
══════════════════════════════════════════════ */
function injectAdminTools() {
  const adminContent = $('adminTabUsers'); if (!adminContent || $('cePostBtn')) return;
  const keyPanel = document.createElement('div');
  keyPanel.style.cssText = 'margin-bottom:12px;padding:14px 16px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm)';
  keyPanel.innerHTML = `<div style="font-weight:700;font-size:0.93rem;margin-bottom:10px">⚙ Platform Keys</div>
    <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:4px;font-weight:600">AI — Groq Key</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input id="groqKeyInput" class="form-input" type="password" placeholder="Paste gsk_... key" style="flex:1;font-size:0.82rem" onfocus="if(this.value.startsWith('•'))this.value=''"><button class="btn btn-accent btn-sm" onclick="saveGroqKey()">Save</button></div>
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px">Free key from console.groq.com</div>
    <div style="font-size:0.78rem;color:var(--success);padding:8px;background:rgba(0,186,124,0.08);border-radius:6px;margin-bottom:4px">✓ Flutterwave key is hardcoded and active</div>`;
  adminContent.insertBefore(keyPanel, adminContent.firstChild);
  const btn = document.createElement('div');
  btn.style.cssText = 'margin-bottom:12px;padding:14px 16px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;gap:12px';
  btn.innerHTML = `<div><div style="font-weight:700;font-size:0.93rem">◈ Claude Engineer</div><div style="font-size:0.78rem;color:var(--text-dim)">Post AI business insight to feed</div></div><button id="cePostBtn" class="btn btn-accent btn-sm" onclick="triggerClaudeEngineerPost()">Post Now</button>`;
  adminContent.insertBefore(btn, keyPanel.nextSibling);
  const countBadge = document.createElement('div'); countBadge.id = 'adminUserCount'; countBadge.style.cssText = 'font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;padding:0 2px';
  adminContent.insertBefore(countBadge, btn.nextSibling);
  window.XF.get('config/groqKey').then(s => { if (s.exists() && s.val()) { const e = $('groqKeyInput'); if (e) e.value = '••••••••••••••••'; } }).catch(() => {});
}

async function triggerClaudeEngineerPost() {
  const btn = $('cePostBtn'); if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }
  await postClaudeEngineerToFeed();
  if (btn) { btn.disabled = false; btn.textContent = 'Post Now'; }
  showToast('[OK] Claude Engineer posted to feed!');
}

async function saveGroqKey() {
  const input = $('groqKeyInput'); if (!input) return;
  const val = input.value.trim();
  if (!val || val.startsWith('•')) { showToast('Paste your Groq key first'); return; }
  if (!val.startsWith('gsk_')) { showToast('Invalid key — Groq keys start with gsk_'); return; }
  try { await window.XF.set('config/groqKey', val); _groqKey = val; input.value = '••••••••••••••••'; showToast('[OK] Groq key saved'); }
  catch (e) { showToast('Failed to save key — check Firebase rules'); }
}

/* ══════════════════════════════════════════════
   ADMIN: EDIT POST LIKES
══════════════════════════════════════════════ */
async function adminLoadPosts() {
  const container = $('adminPostList'); if (!container) return;
  container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">Loading…</div>';
  try {
    const snap = await window.XF.get('posts');
    if (!snap.exists()) { container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">No posts</div>'; return; }
    const posts = []; snap.forEach(c => posts.push({ id: c.key, ...c.val() }));
    posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    container.innerHTML = posts.slice(0, 30).map(p => {
      const likeCount = p.likes ? Object.keys(p.likes).length : 0;
      return `<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;font-size:0.83rem">
        <div style="font-weight:600;margin-bottom:4px;color:var(--text-dim)">@${escapeHTML(p.handle || p.authorUid || '?')} · ${timeAgo(p.createdAt)}</div>
        <div style="margin-bottom:8px;color:var(--text)">${escapeHTML((p.text || '').slice(0, 80))}${(p.text || '').length > 80 ? '…' : ''}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--text-dim);font-size:0.8rem">❤ ${likeCount} likes</span>
          <input id="likeEdit-${p.id}" type="number" value="${likeCount}" min="0" style="width:70px;padding:4px 8px;background:var(--bg-3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:0.8rem;outline:none">
          <button class="btn btn-accent btn-sm" style="font-size:0.75rem;padding:4px 10px" onclick="adminSetLikes('${p.id}')">Set Likes</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) { container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem">Could not load posts</div>'; }
}

async function adminSetLikes(postId) {
  const input = $('likeEdit-' + postId); if (!input) return;
  const newCount = parseInt(input.value); if (isNaN(newCount) || newCount < 0) return showToast('Enter a valid number');
  try {
    const snap = await window.XF.get('posts/' + postId + '/likes');
    const existing = snap.exists() ? snap.val() : {};
    const existingKeys = Object.keys(existing);
    const fakeBase = '_fake_like_';
    const updates = {};
    existingKeys.filter(k => k.startsWith(fakeBase)).forEach(k => updates['posts/' + postId + '/likes/' + k] = null);
    const realCount = existingKeys.filter(k => !k.startsWith(fakeBase)).length;
    const toAdd = Math.max(0, newCount - realCount);
    for (let i = 0; i < toAdd; i++) updates['posts/' + postId + '/likes/' + fakeBase + i] = true;
    await window.XF.multiUpdate(updates);
    showToast('Likes updated to ' + newCount); adminLoadPosts();
  } catch (e) { showToast('Failed to update likes'); }
}
