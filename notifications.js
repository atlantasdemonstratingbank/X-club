// notifications.js — X Club v7
'use strict';

/* ─── TIME FORMATTER ─── */
function formatNotifTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const mins = Math.floor((now - d) / 60000);
  const hours = Math.floor((now - d) / 3600000);
  const days = Math.floor((now - d) / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── BADGE HELPER ─── */
function _setBadge(type, count) {
  const ids = type === 'notif'
    ? ['navNotifBadge', 'mobileNotifBadge']
    : ['navMsgBadge', 'mobileMsgBadge'];
  ids.forEach(id => {
    const b = $(id); if (!b) return;
    b.textContent = count > 99 ? '99+' : String(count);
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ─── MARK ALL READ ─── */
async function markAllNotifsRead() {
  if (!currentUser) return;
  const btn = $('markAllReadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Marking…'; }
  try {
    const snap = await window.XF.get('notifications/' + currentUser.uid);
    if (!snap.exists()) return;
    const updates = {};
    snap.forEach(c => {
      if (!c.val().read) updates['notifications/' + currentUser.uid + '/' + c.key + '/read'] = true;
    });
    if (Object.keys(updates).length > 0) await window.XF.multiUpdate(updates);
    _setBadge('notif', 0);
    renderNotifications();
  } catch (e) { showToast('Could not mark as read'); }
}

/* ─── RENDER NOTIFICATIONS ─── */
async function renderNotifications() {
  const container = $('notifList');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const snap = await window.XF.get('notifications/' + currentUser.uid);
  const allNotifs = [];
  if (snap.exists()) snap.forEach(c => allNotifs.push({ id: c.key, ...c.val() }));

  if (allNotifs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications yet</div></div>';
    _setBadge('notif', 0);
    return;
  }

  // Sort all notifications newest first BEFORE dedup so we keep the latest of each type
  allNotifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Deduplicate:
  // - connection_request: one per sender (keep latest)
  // - new_message: one per sender (keep latest, store count)
  // - everything else: keep all
  const seenConnReq = new Set();
  const seenMsg = new Set();
  const msgCounts = {}; // fromUid -> unread message count

  // Count unread messages per sender first
  allNotifs.forEach(n => {
    if (n.type === 'new_message' && !n.read) {
      msgCounts[n.fromUid] = (msgCounts[n.fromUid] || 0) + 1;
    }
  });

  const deduped = allNotifs.filter(n => {
    if (n.type === 'connection_request') {
      if (seenConnReq.has(n.fromUid)) return false;
      seenConnReq.add(n.fromUid);
      return true;
    }
    if (n.type === 'new_message') {
      if (seenMsg.has(n.fromUid)) return false;
      seenMsg.add(n.fromUid);
      return true;
    }
    return true; // keep all other types (connection_accepted, etc.)
  });

  // Final sort: unread first, then newest within each group
  deduped.sort((a, b) => {
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Fetch connection statuses
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

  const hasUnread = deduped.some(n => !n.read);

  let html = `<div class="notif-toolbar">
    <span class="notif-toolbar-count">${deduped.length} notification${deduped.length !== 1 ? 's' : ''}</span>
    ${hasUnread ? `<button id="markAllReadBtn" class="notif-mark-all-btn" onclick="markAllNotifsRead()">✓ Mark all as read</button>` : ''}
  </div>`;

  let lastGroup = null;

  deduped.forEach(n => {
    const isUnread = !n.read;
    const group = isUnread ? 'unread' : 'read';

    if (group !== lastGroup) {
      html += `<div class="notif-section-header ${group === 'unread' ? 'unread-header' : 'read-header'}">${group === 'unread' ? '● Unread' : '✓ Earlier'}</div>`;
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
        <div class="notif-body">
          <div class="notif-text"><strong>${escapeHTML(n.fromName || 'Someone')}</strong> wants to connect with you</div>
          <div class="notif-time">${time}</div>
          ${actionHTML}
        </div>${dot}</div>`;
      return;
    }

    if (n.type === 'connection_accepted') {
      html += `<div class="${cls}" onclick="openUserProfile('${n.fromUid}',event)">
        <div class="notif-icon">✅</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${escapeHTML(n.fromName || 'Someone')}</strong> accepted your connection request</div>
          <div class="notif-time">${time}</div>
        </div>${dot}</div>`;
      return;
    }

    if (n.type === 'new_message') {
      const count = msgCounts[n.fromUid] || 0;
      const countBadge = count > 1 ? ` <span class="notif-msg-count">${count}</span>` : '';
      html += `<div class="${cls}" onclick="openDMWith('${n.fromUid}')">
        <div class="notif-icon">💬</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${escapeHTML(n.fromName || 'Someone')}</strong> sent you a message${n.preview ? ': <em>' + escapeHTML(n.preview) + '</em>' : ''}${countBadge}</div>
          <div class="notif-time">${time}</div>
        </div>${dot}</div>`;
      return;
    }

    // Generic fallback
    html += `<div class="${cls}">
      <div class="notif-icon">🔔</div>
      <div class="notif-body">
        <div class="notif-text">${escapeHTML(n.text || 'New notification')}</div>
        <div class="notif-time">${time}</div>
      </div>${dot}</div>`;
  });

  container.innerHTML = html;
}

/* ─── NOTIF BADGE WATCHER ─── */
function startNotifWatch() {
  if (!currentUser) return;
  window.XF.on('notifications/' + currentUser.uid, snap => {
    if (!snap.exists()) { _setBadge('notif', 0); return; }

    const seenConnReq = new Set();
    let unread = 0;

    // Sort newest first so dedup keeps the latest
    const all = [];
    snap.forEach(c => all.push(c.val()));
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    all.forEach(n => {
      if (n.read) return;
      if (n.type === 'new_message') return; // msg badge handles this separately
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

/* ─── MSG BADGE WATCHER ─── */
let _msgBadgeListeners = [];
let _lastMsgKey = {};

async function startMsgWatch() {
  if (!currentUser) return;

  window.XF.on('connections/' + currentUser.uid, async function (connSnap) {
    _msgBadgeListeners.forEach(fn => { try { fn(); } catch (e) {} });
    _msgBadgeListeners = [];
    if (!connSnap.exists()) { _setBadge('msg', 0); return; }

    const uids = Object.keys(connSnap.val());
    uids.forEach(uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const ref = window.XF.db.ref('dms/' + convId);
      const handler = async function (dmSnap) {
        refreshMsgBadge();
        // Refresh conv list if visible
        if (activePage === 'messages' &&
            $('messagesListView') &&
            $('messagesListView').style.display !== 'none') {
          renderConversations();
        }
        // Show popup for new incoming message when not in that chat
        if (dmSnap.exists() && activeConvUid !== uid) {
          const msgs = [];
          dmSnap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
          msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          const latest = msgs[msgs.length - 1];
          if (latest &&
              latest.senderUid !== currentUser.uid &&
              (!latest.readBy || !latest.readBy[currentUser.uid]) &&
              _lastMsgKey[convId] !== latest.id) {
            _lastMsgKey[convId] = latest.id;
            try {
              const pSnap = await window.XF.get('users/' + uid);
              const profile = pSnap.exists() ? pSnap.val() : { displayName: 'New message', photoURL: '' };
              showMsgPopup(uid, profile, latest.imageUrl ? '📷 Photo' : (latest.text || ''));
            } catch (e) {}
          }
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

/* ─── IN-APP MESSAGE POPUP ─── */
let _popupTimer = null;
function showMsgPopup(uid, profile, previewText) {
  const existing = document.querySelector('.msg-popup');
  if (existing) existing.remove();
  clearTimeout(_popupTimer);

  const popup = document.createElement('div');
  popup.className = 'msg-popup';
  popup.innerHTML = `
    <div class="msg-popup-avatar">${avatarHTML(profile, 'sm')}</div>
    <div class="msg-popup-body">
      <div class="msg-popup-name">${escapeHTML(profile.displayName || 'New message')}</div>
      <div class="msg-popup-preview">${escapeHTML((previewText || '').slice(0, 60))}</div>
    </div>
    <div class="msg-popup-close">✕</div>`;

  // Tapping X closes only
  popup.querySelector('.msg-popup-close').onclick = function (e) {
    e.stopPropagation();
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 350);
    clearTimeout(_popupTimer);
  };

  // Tapping anywhere else opens chat
  popup.onclick = function () {
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 350);
    clearTimeout(_popupTimer);
    openDMWith(uid);
  };

  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add('visible'));

  // Auto-dismiss after 5s
  _popupTimer = setTimeout(() => {
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 350);
  }, 5000);
}
