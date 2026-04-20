// admin.js — X Club v7
'use strict';

/* ══════════════════════════════════════════════
   TABS
══════════════════════════════════════════════ */
function switchAdminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['users','posts','stats','settings'].forEach(t =>
    $('adminTab' + t.charAt(0).toUpperCase() + t.slice(1)).style.display = tab === t ? 'block' : 'none'
  );
  if (tab === 'stats')    { loadAdminStats(); loadScheduledPostsAdmin(); }
  if (tab === 'posts')    { adminLoadPosts(); }
  if (tab === 'settings') { loadAdminSettings(); }
}

/* ══════════════════════════════════════════════
   USERS TAB
══════════════════════════════════════════════ */
async function loadAdminUsers() {
  const container = $('adminUserList'); if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const [usersSnap, dmsSnap] = await Promise.all([
      window.XF.get('users'),
      window.XF.get('dms')
    ]);
    allUsersCache = [];
    if (usersSnap.exists()) usersSnap.forEach(c => {
      const v = c.val();
      if (v && typeof v === 'object') allUsersCache.push({ id: c.key, uid: v.uid || c.key, ...v });
    });
    allUsersCache.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));

    // Compute unread counts from single dms fetch
    const unreadMap = {};
    if (dmsSnap.exists()) {
      dmsSnap.forEach(conv => {
        conv.forEach(msg => {
          const m = msg.val();
          if (!m || !m.senderUid) return;
          // find the recipient uid (the one who is NOT the sender in this conv key)
          const uids = conv.key.split('_');
          const recipientUid = uids.find(u => u !== m.senderUid);
          if (!recipientUid) return;
          if (!m.readBy || !m.readBy[recipientUid]) {
            unreadMap[recipientUid] = (unreadMap[recipientUid] || 0) + 1;
          }
        });
      });
    }

    // Total unread across all users for the stat card
    const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    const unreadStat = $('statUnreadMsgs');
    if (unreadStat) unreadStat.textContent = totalUnread;

    renderAdminUsers(allUsersCache, unreadMap);
    const ce = $('adminUserCount');
    if (ce) ce.textContent = allUsersCache.length + ' members';
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load users</div></div>';
  }
}

function renderAdminUsers(users, unreadMap = {}) {
  const container = $('adminUserList'); if (!container) return;
  if (!users.length) { container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">No users found</div></div>'; return; }
  container.innerHTML = users.map(u => {
    const unread = unreadMap[u.uid] || 0;
    return `<div class="au-card" id="adminCard-${u.uid}">
      <div class="au-top">
        ${avatarHTML(u, 'md')}
        <div class="au-info">
          <div class="au-name">
            ${escapeHTML(u.displayName || 'Member')}
            ${u.verified ? '<span class="au-badge verified">✓ Verified</span>' : '<span class="au-badge">Unverified</span>'}
            ${unread > 0 ? `<span class="au-badge unread">${unread} unread</span>` : ''}
          </div>
          <div class="au-meta">@${escapeHTML(u.handle || '?')} · ${escapeHTML(u.email || '')} · ${formatCount(u.followersCount || 0)} followers</div>
        </div>
      </div>
      <div class="au-actions">
        <div class="au-action-group">
          <label class="au-action-label">Followers</label>
          <div class="au-action-row">
            <input class="au-input" id="flwInput-${u.uid}" type="number" value="${u.followersCount || 0}" min="0">
            <button class="btn btn-accent btn-sm" onclick="adminSetFollowers('${u.uid}')">Set</button>
          </div>
        </div>
        <div class="au-action-group">
          <label class="au-action-label">Verification</label>
          <div class="au-action-row">
            ${u.verified
              ? `<button class="btn btn-sm" style="background:var(--danger);color:#fff;white-space:nowrap" onclick="adminToggleVerify('${u.uid}',false)">Unverify</button>`
              : `<button class="btn btn-sm" style="background:var(--success);color:#fff;white-space:nowrap" onclick="adminToggleVerify('${u.uid}',true)">Verify</button>`}
          </div>
        </div>
        <div class="au-action-group">
          <label class="au-action-label">Danger</label>
          <div class="au-action-row">
            <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="adminDeleteUser('${u.uid}')">Delete</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function adminSearchUsers(query) {
  if (!query) { renderAdminUsers(allUsersCache); return; }
  const q = query.toLowerCase();
  renderAdminUsers(allUsersCache.filter(u =>
    (u.displayName||'').toLowerCase().includes(q) ||
    (u.handle||'').toLowerCase().includes(q) ||
    (u.email||'').toLowerCase().includes(q)
  ));
}

async function adminSetFollowers(uid) {
  const input = $('flwInput-' + uid);
  const val = parseInt(input.value);
  if (isNaN(val) || val < 0) return showToast('Enter a valid number');
  try {
    await window.XF.update('users/' + uid, { followersCount: val });
    const u = allUsersCache.find(x => x.uid === uid);
    if (u) u.followersCount = val;
    showToast('Followers updated!');
  } catch { showToast('Failed to update followers'); }
}

async function adminToggleVerify(uid, verify) {
  try {
    await window.XF.update('users/' + uid, { verified: verify, ...(verify ? { verifiedAt: window.XF.ts() } : { verifiedAt: null }) });
    const u = allUsersCache.find(x => x.uid === uid);
    if (u) u.verified = verify;
    renderAdminUsers(allUsersCache);
    showToast(verify ? '✓ User verified!' : 'User unverified');
  } catch { showToast('Failed to update verification'); }
}

async function adminDeleteUser(uid) {
  if (!confirm('Delete this user and all their data? Cannot be undone.')) return;
  try {
    await Promise.all([
      window.XF.remove('users/' + uid),
      window.XF.remove('notifications/' + uid),
      window.XF.remove('connections/' + uid)
    ]);
    allUsersCache = allUsersCache.filter(u => u.uid !== uid);
    renderAdminUsers(allUsersCache);
    showToast('User deleted');
  } catch { showToast('Failed to delete user'); }
}

/* ══════════════════════════════════════════════
   POSTS TAB — view all posts, delete, set likes
══════════════════════════════════════════════ */
async function adminLoadPosts() {
  const container = $('adminPostList'); if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const snap = await window.XF.get('posts');
    if (!snap.exists()) { container.innerHTML = '<div class="ap-empty">No posts yet</div>'; return; }
    const posts = [];
    snap.forEach(c => posts.push({ id: c.key, ...c.val() }));
    posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    container.innerHTML = posts.map(p => {
      const likes = p.likes ? Object.keys(p.likes).length : 0;
      const img   = p.imageUrl ? `<img src="${escapeHTML(p.imageUrl)}" class="ap-img">` : '';
      return `<div class="ap-card">
        <div class="ap-meta">@${escapeHTML(p.handle || p.authorUid || '?')} · ${timeAgo(p.createdAt)}</div>
        ${img}
        <div class="ap-text">${escapeHTML((p.text || '').slice(0, 120))}${(p.text||'').length > 120 ? '…' : ''}</div>
        <div class="ap-controls">
          <div class="ap-likes-wrap">
            <span class="ap-likes-count">❤ ${likes}</span>
            <input id="likeEdit-${p.id}" type="number" value="${likes}" min="0" class="au-input" style="width:70px">
            <button class="btn btn-accent btn-sm" onclick="adminSetLikes('${p.id}')">Set</button>
          </div>
          <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="adminDeletePost('${p.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch { container.innerHTML = '<div class="ap-empty">Could not load posts</div>'; }
}

async function adminSetLikes(postId) {
  const input = $('likeEdit-' + postId); if (!input) return;
  const newCount = parseInt(input.value);
  if (isNaN(newCount) || newCount < 0) return showToast('Enter a valid number');
  try {
    const snap = await window.XF.get('posts/' + postId + '/likes');
    const existing = snap.exists() ? snap.val() : {};
    const fakeBase = '_fake_like_';
    const updates = {};
    Object.keys(existing).filter(k => k.startsWith(fakeBase))
      .forEach(k => updates['posts/' + postId + '/likes/' + k] = null);
    const realCount = Object.keys(existing).filter(k => !k.startsWith(fakeBase)).length;
    for (let i = 0; i < Math.max(0, newCount - realCount); i++)
      updates['posts/' + postId + '/likes/' + fakeBase + i] = true;
    await window.XF.multiUpdate(updates);
    showToast('Likes updated to ' + newCount);
    adminLoadPosts();
  } catch { showToast('Failed to update likes'); }
}

async function adminDeletePost(postId) {
  if (!confirm('Delete this post permanently?')) return;
  try {
    await window.XF.remove('posts/' + postId);
    showToast('Post deleted');
    adminLoadPosts();
  } catch { showToast('Failed to delete post'); }
}

/* ══════════════════════════════════════════════
   STATS TAB
══════════════════════════════════════════════ */
async function loadAdminStats() {
  try {
    const [us, ps] = await Promise.all([window.XF.get('users'), window.XF.get('posts')]);
    let total = 0, verified = 0, posts = 0;
    if (us.exists()) us.forEach(c => { total++; if (c.val().verified) verified++; });
    if (ps.exists()) ps.forEach(() => posts++);
    const el = id => $(id);
    if (el('statTotalUsers')) el('statTotalUsers').textContent = total;
    if (el('statVerified'))   el('statVerified').textContent   = verified;
    if (el('statPosts'))      el('statPosts').textContent      = posts;
  } catch {}
}

async function loadScheduledPostsAdmin() {
  const statsTab = $('adminTabStats'); if (!statsTab) return;
  if (!$('scheduledPostsList')) {
    const s = document.createElement('div');
    s.style.marginTop = '24px';
    s.innerHTML = `<div class="admin-section-title" style="margin-bottom:10px">◷ Scheduled Posts</div><div id="scheduledPostsList"></div>`;
    statsTab.appendChild(s);
  }
  const container = $('scheduledPostsList'); if (!container) return;
  container.innerHTML = '<div class="ap-empty">Loading…</div>';
  try {
    const snap = await window.XF.get('scheduledPosts');
    if (!snap.exists()) { container.innerHTML = '<div class="ap-empty">No scheduled posts</div>'; return; }
    const all = Object.entries(snap.val()).filter(([, p]) => p.status === 'scheduled');
    if (!all.length) { container.innerHTML = '<div class="ap-empty">No pending posts</div>'; return; }
    all.sort(([, a], [, b]) => a.fireAt - b.fireAt);
    container.innerHTML = all.map(([key, p]) => `
      <div class="ap-card">
        <div class="ap-meta">@${escapeHTML(p.handle || '?')} · <span style="color:var(--accent)">◷ ${new Date(p.fireAt).toLocaleString()}</span></div>
        <div class="ap-text">${escapeHTML(p.text)}</div>
        <button class="btn btn-outline btn-sm" style="color:var(--danger);margin-top:8px" onclick="cancelScheduled('${key}')">Cancel</button>
      </div>`).join('');
  } catch { container.innerHTML = '<div class="ap-empty">Could not load</div>'; }
}

async function cancelScheduled(key) {
  await window.XF.set('scheduledPosts/' + key + '/status', 'cancelled');
  showToast('Scheduled post cancelled');
  loadScheduledPostsAdmin();
}

/* ══════════════════════════════════════════════
   SETTINGS TAB
══════════════════════════════════════════════ */
async function loadAdminSettings() {
  const container = $('adminSettingsContent'); if (!container) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const snap = await window.XF.get('appConfig');
    const cfg  = snap.exists() ? snap.val() : {};
    const price    = cfg.membershipPrice    ?? 1999;
    const currency = cfg.membershipCurrency ?? 'EUR';
    const label    = cfg.membershipLabel    ?? '€1,999';

    container.innerHTML = `
      <div class="as-section">
        <div class="as-section-title">💳 Membership Pricing</div>
        <div class="as-row">
          <div class="as-label">Price <span class="as-sub">Amount charged at checkout</span></div>
          <input id="cfgPrice" type="number" min="1" value="${price}" class="as-input" style="width:110px">
        </div>
        <div class="as-row">
          <div class="as-label">Currency <span class="as-sub">ISO code — EUR, USD, NGN…</span></div>
          <input id="cfgCurrency" type="text" maxlength="3" value="${escapeHTML(currency)}" class="as-input" style="width:80px;text-transform:uppercase">
        </div>
        <div class="as-row">
          <div class="as-label">Display Label <span class="as-sub">Shown on paywall — e.g. €1,999</span></div>
          <input id="cfgLabel" type="text" maxlength="20" value="${escapeHTML(label)}" class="as-input" style="width:120px">
        </div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="saveAdminSettings()">Save Pricing</button>
        <span id="settingsSaveStatus" style="font-size:0.82rem;color:var(--success);margin-left:12px"></span>
      </div>

      <div class="as-section">
        <div class="as-section-title">🔑 Platform Keys</div>
        <div class="as-row">
          <div class="as-label">Groq API Key <span class="as-sub">console.groq.com — free</span></div>
          <div style="display:flex;gap:8px;flex:1;min-width:0">
            <input id="groqKeyInput" type="password" placeholder="gsk_…" class="as-input" style="flex:1" onfocus="if(this.value.startsWith('•'))this.value=''">
            <button class="btn btn-accent btn-sm" onclick="saveGroqKey()">Save</button>
          </div>
        </div>
        <div style="font-size:0.78rem;color:var(--success);padding:8px 12px;background:rgba(0,186,124,0.08);border-radius:6px;margin-top:4px">✓ Flutterwave key is hardcoded and active</div>
      </div>

      <div class="as-section">
        <div class="as-section-title">◈ Claude Engineer</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="font-size:0.85rem;color:var(--text-dim)">Post an AI business insight to the feed</div>
          <button id="cePostBtn" class="btn btn-accent btn-sm" onclick="triggerClaudeEngineerPost()">Post Now</button>
        </div>
      </div>`;

    window.XF.get('config/groqKey').then(s => {
      if (s.exists() && s.val()) { const e = $('groqKeyInput'); if (e) e.value = '••••••••••••••••'; }
    }).catch(() => {});
  } catch {
    container.innerHTML = '<div class="ap-empty">Could not load settings</div>';
  }
}

async function saveAdminSettings() {
  const price    = parseInt($('cfgPrice')?.value);
  const currency = ($('cfgCurrency')?.value || '').trim().toUpperCase();
  const label    = ($('cfgLabel')?.value || '').trim();
  const status   = $('settingsSaveStatus');
  if (isNaN(price) || price < 1)        { showToast('Enter a valid price'); return; }
  if (!currency || currency.length < 2) { showToast('Enter a valid currency code'); return; }
  if (!label)                           { showToast('Enter a display label'); return; }
  try {
    await window.XF.update('appConfig', { membershipPrice: price, membershipCurrency: currency, membershipLabel: label });
    if (status) { status.textContent = '✓ Saved'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    showToast('Settings saved!');
    const pp = document.querySelector('.paywall-price');
    if (pp) pp.textContent = label;
  } catch { showToast('Failed to save settings'); }
}

/* ══════════════════════════════════════════════
   INJECT TOOLS (called on admin login)
══════════════════════════════════════════════ */
function injectAdminTools() {
  const adminContent = $('adminTabUsers');
  if (!adminContent || $('adminUserCount')) return;
  const countBadge = document.createElement('div');
  countBadge.id = 'adminUserCount';
  countBadge.style.cssText = 'font-size:0.8rem;color:var(--text-dim);margin-bottom:12px';
  const titleEl = adminContent.querySelector('.admin-section-title');
  if (titleEl) titleEl.after(countBadge); else adminContent.prepend(countBadge);
}

async function triggerClaudeEngineerPost() {
  const btn = $('cePostBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }
  await postClaudeEngineerToFeed();
  if (btn) { btn.disabled = false; btn.textContent = 'Post Now'; }
  showToast('[OK] Claude Engineer posted!');
}

async function saveGroqKey() {
  const input = $('groqKeyInput'); if (!input) return;
  const val = input.value.trim();
  if (!val || val.startsWith('•')) { showToast('Paste your Groq key first'); return; }
  if (!val.startsWith('gsk_'))     { showToast('Groq keys start with gsk_'); return; }
  try {
    await window.XF.set('config/groqKey', val);
    _groqKey = val;
    input.value = '••••••••••••••••';
    showToast('[OK] Groq key saved');
  } catch { showToast('Failed to save key'); }
}
