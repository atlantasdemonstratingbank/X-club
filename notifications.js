// notifications.js — X Club v7 — Notifications Rendering & Badge Watching
'use strict';

/* ══════════════════════════════════════════════
   TIME FORMATTER
══════════════════════════════════════════════ */
function formatNotifTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  const diffHours = Math.floor((now - d) / 3600000);
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════
   BADGE HELPER
══════════════════════════════════════════════ */
function _setBadge(type, count) {
  const ids = type === 'notif' ? ['navNotifBadge', 'mobileNotifBadge'] : ['navMsgBadge', 'mobileMsgBadge'];
  ids.forEach(id => {
    const b = $(id); if (!b) return;
    b.textContent = count > 99 ? '99+' : String(count);
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ══════════════════════════════════════════════
   RENDER NOTIFICATIONS
══════════════════════════════════════════════ */
async function renderNotifications() {
  const container = $('notifList');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const snap = await window.XF.get('notifications/' + currentUser.uid);
  const notifs = [];
  if (snap.exists()) snap.forEach(c => notifs.push({ id: c.key, ...c.val() }));

  if (notifs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications yet</div></div>';
    _setBadge('notif', 0);
    return;
  }

  // Deduplicate connection_request per sender
  const seenConnReq = new Set();
  const deduped = notifs.filter(n => {
    if (n.type !== 'connection_request') return true;
    if (seenConnReq.has(n.fromUid)) return false;
    seenConnReq.add(n.fromUid); return true;
  });

  // Sort: unread first, then newest first within each group
  deduped.sort((a, b) => {
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Pre-fetch connection status for connection_request notifs
  const connStatusMap = {};
  await Promise.all(
    deduped.filter(n => n.type === 'connection_request' && n.reqId).map(async n => {
      try {
        const cs = await window.XF.get('connections/' + currentUser.uid + '/' + n.fromUid);
        if (cs.exists()) { connStatusMap[n.reqId] = 'connected'; return; }
        const rs = await window.XF.get('connectionRequests/' + n.reqId);
        connStatusMap[n.reqId] = rs.exists() ? rs.val().status : 'pending';
      } catch (e) { connStatusMap[n.reqId] = 'pending'; }
    })
  );

  let html = '';
  let lastGroup = null; // 'unread' or 'read'

  deduped.forEach(n => {
    const isUnread = !n.read;
    const group = isUnread ? 'unread' : 'read';

    // Section divider
    if (group !== lastGroup) {
      if (group === 'unread') {
        html += `<div class="notif-section-header" style="color:var(--accent);border-color:var(--accent-dim)">● Unread</div>`;
      } else {
        html += `<div class="notif-section-header" style="color:var(--text-dim)">✓ Earlier</div>`;
      }
      lastGroup = group;
    }

    const cls = 'notif-item' + (isUnread ? ' unread' : '');
    const dot = isUnread ? '<div class="notif-unread-dot"></div>' : '';
    const time = formatNotifTime(n.createdAt);

    if (n.type === 'connection_request') {
      const status = connStatusMap[n.reqId] || 'pending';
      let actionHTML = '';
      if (status === 'connected' || status === 'accepted') {
        actionHTML = `<div class="notif-action-done">✓ Connected</div>`;
      } else if (status === 'declined') {
        actionHTML = `<div class="notif-action-declined">Declined</div>`;
      } else {
        actionHTML = `<div class="notif-action-btns" id="connBtns_${n.reqId}">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();acceptConnectionFromNotif('${n.reqId}','${n.fromUid}',this)">Accept</button>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();declineConnection('${n.reqId}')">Decline</button>
        </div>`;
      }
      html += `<div class="${cls}" onclick="openUserProfile('${n.fromUid}',event)">
        <div class="notif-icon">🤝</div>
        <div class="notif-body"><div class="notif-text"><strong>${escapeHTML(n.fromName || 'Someone')}</strong> wants to connect with you</div><div class="notif-time">${time}</div>${actionHTML}</div>
        ${dot}
      </div>`;
      return;
    }

    if (n.type === 'connection_accepted') {
      html += `<div class="${cls}" onclick="openUserProfile('${n.fromUid}',event)">
        <div class="notif-icon">✅</div>
        <div class="notif-body"><div class="notif-text"><strong>${escapeHTML(n.fromName || 'Someone')}</strong> accepted your connection request</div><div class="notif-time">${time}</div></div>
        ${dot}
      </div>`;
      return;
    }

    if (n.type === 'new_message') {
      html += `<div class="${cls}" onclick="openDMWith('${n.fromUid}')">
        <div class="notif-icon">💬</div>
        <div class="notif-body"><div class="notif-text"><strong>${escapeHTML(n.fromName || 'Someone')}</strong> sent you a message${n.preview ? ': <em>' + escapeHTML(n.preview) + '</em>' : ''}</div><div class="notif-time">${time}</div></div>
        ${dot}
      </div>`;
      return;
    }

    html += `<div class="${cls}">
      <div class="notif-icon">🔔</div>
      <div class="notif-body"><div class="notif-text">${escapeHTML(n.text || 'New notification')}</div><div class="notif-time">${time}</div></div>
      ${dot}
    </div>`;
  });

  container.innerHTML = html;

  // Mark all as read after 1.5s
  const unreadItems = notifs.filter(n => !n.read);
  if (unreadItems.length > 0) {
    setTimeout(async () => {
      const updates = {};
      unreadItems.forEach(n => { updates['notifications/' + currentUser.uid + '/' + n.id + '/read'] = true; });
      try { await window.XF.multiUpdate(updates); } catch (e) {}
      _setBadge('notif', 0);
    }, 1500);
  }
}

/* ══════════════════════════════════════════════
   NOTIF BADGE WATCHER
   new_message excluded — it has its own msg badge
══════════════════════════════════════════════ */
function startNotifWatch() {
  if (!currentUser) return;
  window.XF.on('notifications/' + currentUser.uid, snap => {
    if (!snap.exists()) { _setBadge('notif', 0); return; }
    const seenConnReq = new Set();
    let unread = 0;
    snap.forEach(c => {
      const n = c.val();
      if (n.read) return;
      if (n.type === 'new_message') return; // msg badge handles this
      if (n.type === 'connection_request') {
        if (seenConnReq.has(n.fromUid)) return;
        seenConnReq.add(n.fromUid);
      }
      unread++;
    });
    _setBadge('notif', unread);
    if (activePage === 'notifications') renderNotifications();
  });
}

/* ══════════════════════════════════════════════
   MSG BADGE WATCHER — real-time per-conversation
══════════════════════════════════════════════ */
let _msgBadgeListeners = [];

async function startMsgWatch() {
  if (!currentUser) return;

  window.XF.on('connections/' + currentUser.uid, async function (connSnap) {
    // Tear down old listeners
    _msgBadgeListeners.forEach(fn => { try { fn(); } catch (e) {} });
    _msgBadgeListeners = [];

    if (!connSnap.exists()) { _setBadge('msg', 0); return; }

    const uids = Object.keys(connSnap.val());

    // Watch each conversation for any change → recount
    uids.forEach(uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const ref = window.XF.db.ref('dms/' + convId);
      const handler = function () {
        refreshMsgBadge();
        if (activePage === 'messages' && $('messagesListView') && $('messagesListView').style.display !== 'none') {
          renderConversations();
        }
      };
      ref.on('value', handler);
      _msgBadgeListeners.push(() => ref.off('value', handler));
    });

    refreshMsgBadge();
  });
}

async function refreshMsgBadge() {
  if (!currentUser) return;
  try {
    const connSnap = await window.XF.get('connections/' + currentUser.uid);
    if (!connSnap.exists()) { _setBadge('msg', 0); return; }
    const uids = Object.keys(connSnap.val());
    let total = 0;
    await Promise.all(uids.map(async uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const dmSnap = await window.XF.get('dms/' + convId);
      if (!dmSnap.exists()) return;
      dmSnap.forEach(c => {
        const m = c.val();
        if (m.senderUid !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])) total++;
      });
    }));
    _setBadge('msg', total);
  } catch (e) {}
}
