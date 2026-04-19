// notifications.js — X Club v7 — Notifications Rendering & Badge Watching
'use strict';

/* ══════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════ */
async function renderNotifications() {
  const container = $('notifList');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const snap = await window.XF.get('notifications/' + currentUser.uid);
  const notifs = [];
  if (snap.exists()) snap.forEach(c => notifs.push({ id: c.key, ...c.val() }));
  notifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (notifs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⍾</div><div class="empty-state-title">No notifications yet</div></div>';
    ['navNotifBadge', 'mobileNotifBadge'].forEach(id => { const b = $(id); if (b) { b.textContent = '0'; b.style.display = 'none'; } });
    return;
  }

  const connReqNotifs = notifs.filter(n => n.type === 'connection_request' && n.reqId && n.fromUid);
  const connStatusMap = {};
  await Promise.all(connReqNotifs.map(async n => {
    const cs = await window.XF.get('connections/' + currentUser.uid + '/' + n.fromUid);
    if (cs.exists()) { connStatusMap[n.reqId] = 'connected'; return; }
    const rs = await window.XF.get('connectionRequests/' + n.reqId);
    connStatusMap[n.reqId] = rs.exists() ? rs.val().status : 'pending';
  }));

  const seenConnReq = new Set();
  const deduped = notifs.filter(n => {
    if (n.type !== 'connection_request') return true;
    if (seenConnReq.has(n.fromUid)) return false;
    seenConnReq.add(n.fromUid); return true;
  });

  container.innerHTML = deduped.map(n => {
    const u = n.read ? '' : 'unread';
    if (n.type === 'connection_request') {
      const status = connStatusMap[n.reqId] || 'pending';
      let actionHTML = '';
      if (status === 'connected' || status === 'accepted') {
        actionHTML = '<div style="margin-top:8px"><span style="color:var(--success);font-size:0.85rem;font-weight:600">✓ Connected</span></div>';
      } else if (status === 'declined') {
        actionHTML = '<div style="margin-top:8px"><span style="color:var(--text-dim);font-size:0.85rem">Request declined</span></div>';
      } else {
        actionHTML = `<div id="connBtns_${n.reqId}" style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary btn-sm" onclick="acceptConnectionFromNotif('${n.reqId}','${n.fromUid}',this)">Accept</button><button class="btn btn-outline btn-sm" onclick="declineConnection('${n.reqId}')">Decline</button></div>`;
      }
      return `<div class="notif-item ${u}"><div class="notif-icon">🤝</div><div style="flex:1"><div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> wants to connect with you</div><div class="notif-time">${timeAgo(n.createdAt)}</div>${actionHTML}</div></div>`;
    }
    if (n.type === 'connection_accepted') return `<div class="notif-item ${u}"><div class="notif-icon">✅</div><div style="flex:1"><div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> accepted your connection request</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`;
    if (n.type === 'new_message') return `<div class="notif-item ${u}" onclick="openDMWith('${n.fromUid}')"><div class="notif-icon">💬</div><div style="flex:1"><div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> sent you a message${n.preview ? ': ' + escapeHTML(n.preview) : ''}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`;
    return `<div class="notif-item ${u}"><div class="notif-icon">🔔</div><div style="flex:1"><div class="notif-text">${escapeHTML(n.text || 'New notification')}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`;
  }).join('');

  const unread = notifs.filter(n => !n.read);
  if (unread.length > 0) {
    setTimeout(async () => {
      const updates = {};
      unread.forEach(n => { updates['notifications/' + currentUser.uid + '/' + n.id + '/read'] = true; });
      try { await window.XF.multiUpdate(updates); } catch (e) {}
      ['navNotifBadge', 'mobileNotifBadge'].forEach(id => { const b = $(id); if (b) { b.textContent = '0'; b.style.display = 'none'; } });
    }, 1500);
  }
}

function startNotifWatch() {
  if (!currentUser) return;
  window.XF.on('notifications/' + currentUser.uid, snap => {
    if (!snap.exists()) {
      ['navNotifBadge', 'mobileNotifBadge'].forEach(id => { const b = $(id); if (b) { b.textContent = '0'; b.style.display = 'none'; } });
      return;
    }
    const seenConnReq = new Set();
    let unread = 0;
    snap.forEach(c => {
      const n = c.val();
      if (n.read) return;
      if (n.type === 'connection_request') {
        if (seenConnReq.has(n.fromUid)) return;
        seenConnReq.add(n.fromUid);
      }
      unread++;
    });
    ['navNotifBadge', 'mobileNotifBadge'].forEach(id => {
      const b = $(id); if (!b) return;
      b.textContent = unread;
      b.style.display = unread > 0 ? 'flex' : 'none';
    });
    if (activePage === 'notifications') renderNotifications();
  });
}

async function startMsgWatch() {
  if (!currentUser) return;
  window.XF.on('connections/' + currentUser.uid, async function (connSnap) {
    if (!connSnap.exists()) {
      ['navMsgBadge', 'mobileMsgBadge'].forEach(id => { const b = $(id); if (b) { b.textContent = '0'; b.style.display = 'none'; } });
      return;
    }
    refreshMsgBadge();
  });
  refreshMsgBadge();
}
