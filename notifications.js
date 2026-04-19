// notifications.js — X Club v7 — Clean rebuild
'use strict';

/* ════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */
function _nTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = Date.now(), diff = now - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const dy = Math.floor(diff / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  if (dy < 7) return dy + 'd ago';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function _setBadge(type, count) {
  const n = count > 99 ? '99+' : String(count > 0 ? count : '');
  const show = count > 0;
  const ids = type === 'notif'
    ? ['navNotifBadge', 'mobileNotifBadge']
    : ['navMsgBadge', 'mobileMsgBadge'];
  ids.forEach(id => {
    const b = $(id); if (!b) return;
    b.textContent = n;
    b.style.display = show ? 'flex' : 'none';
  });
}

/* ════════════════════════════════════════════════════════
   MARK ALL READ
════════════════════════════════════════════════════════ */
async function markAllNotifsRead() {
  if (!currentUser) return;
  const btn = $('markAllReadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Marking…'; }
  try {
    const snap = await window.XF.get('notifications/' + currentUser.uid);
    if (!snap.exists()) return;
    const updates = {};
    snap.forEach(c => {
      if (!c.val().read)
        updates['notifications/' + currentUser.uid + '/' + c.key + '/read'] = true;
    });
    if (Object.keys(updates).length > 0) await window.XF.multiUpdate(updates);
    _setBadge('notif', 0);
    renderNotifications();
  } catch (e) { showToast('Could not mark all as read'); }
}

/* ════════════════════════════════════════════════════════
   RENDER NOTIFICATIONS
   Rules:
   - Fetch ALL notifs, sort newest first
   - Dedupe: keep one connection_request per sender (latest)
   - Dedupe: keep one new_message per sender (latest), track count
   - Keep ALL connection_accepted (no dedup)
   - Sort final list: unread group first, then by time
   - Show "Mark all as read" button when any unread exists
   - Section headers: ● Unread  /  ✓ Earlier
════════════════════════════════════════════════════════ */
async function renderNotifications() {
  const container = $('notifList');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  let allNotifs = [];
  try {
    const snap = await window.XF.get('notifications/' + currentUser.uid);
    if (snap.exists()) snap.forEach(c => allNotifs.push({ id: c.key, ...c.val() }));
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load notifications</div></div>';
    return;
  }

  if (allNotifs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications yet</div></div>';
    _setBadge('notif', 0);
    return;
  }

  // Step 1: sort ALL newest first (so dedup keeps the latest per sender)
  allNotifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Step 2: count unread messages per sender BEFORE dedup
  const unreadMsgCount = {};
  allNotifs.forEach(n => {
    if (n.type === 'new_message' && !n.read)
      unreadMsgCount[n.fromUid] = (unreadMsgCount[n.fromUid] || 0) + 1;
  });

  // Step 3: deduplicate
  const seenConnReq = new Set();
  const seenMsg = new Set();
  const deduped = [];
  allNotifs.forEach(n => {
    if (n.type === 'connection_request') {
      if (seenConnReq.has(n.fromUid)) return;
      seenConnReq.add(n.fromUid);
      deduped.push(n);
    } else if (n.type === 'new_message') {
      if (seenMsg.has(n.fromUid)) return;
      seenMsg.add(n.fromUid);
      deduped.push(n);
    } else {
      // connection_accepted and anything else — always show
      deduped.push(n);
    }
  });

  // Step 4: sort deduped — unread first, then newest
  deduped.sort((a, b) => {
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Step 5: fetch connection statuses for connection_request notifs
  const connStatus = {};
  await Promise.all(
    deduped
      .filter(n => n.type === 'connection_request' && n.reqId && n.fromUid)
      .map(async n => {
        try {
          const cs = await window.XF.get('connections/' + currentUser.uid + '/' + n.fromUid);
          if (cs.exists()) { connStatus[n.reqId] = 'connected'; return; }
          const rs = await window.XF.get('connectionRequests/' + n.reqId);
          connStatus[n.reqId] = rs.exists() ? (rs.val().status || 'pending') : 'pending';
        } catch (e) { connStatus[n.reqId] = 'pending'; }
      })
  );

  // Step 6: build HTML
  const hasUnread = deduped.some(n => !n.read);
  let html = `<div class="notif-toolbar">
    <span class="notif-toolbar-count">${deduped.length} notification${deduped.length !== 1 ? 's' : ''}</span>
    ${hasUnread ? `<button id="markAllReadBtn" class="notif-mark-all-btn" onclick="markAllNotifsRead()">✓ Mark all as read</button>` : ''}
  </div>`;

  let lastGroup = null;
  deduped.forEach(n => {
    const unread = !n.read;
    const group = unread ? 'unread' : 'read';
    if (group !== lastGroup) {
      html += `<div class="notif-section-header ${group === 'unread' ? 'unread-header' : 'read-header'}">${group === 'unread' ? '● Unread' : '✓ Earlier'}</div>`;
      lastGroup = group;
    }
    const cls = 'notif-item' + (unread ? ' unread' : '');
    const dot = unread ? '<div class="notif-unread-dot"></div>' : '';
    const time = _nTime(n.createdAt);

    if (n.type === 'connection_request') {
      const st = connStatus[n.reqId] || 'pending';
      let action = '';
      if (st === 'connected' || st === 'accepted') {
        action = `<div class="notif-action-done">✓ Connected</div>`;
      } else if (st === 'declined') {
        action = `<div class="notif-action-declined">Declined</div>`;
      } else {
        action = `<div class="notif-action-btns" id="connBtns_${n.reqId}">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();acceptConnectionFromNotif('${n.reqId}','${n.fromUid}',this)">Accept</button>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();declineConnection('${n.reqId}')">Decline</button>
        </div>`;
      }
      html += `<div class="${cls}" onclick="openUserProfile('${n.fromUid}',event)">
        <div class="notif-icon">🤝</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${escapeHTML(n.fromName||'Someone')}</strong> wants to connect with you</div>
          <div class="notif-time">${time}</div>
          ${action}
        </div>${dot}</div>`;
      return;
    }

    if (n.type === 'connection_accepted') {
      html += `<div class="${cls}" onclick="openUserProfile('${n.fromUid}',event)">
        <div class="notif-icon">✅</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${escapeHTML(n.fromName||'Someone')}</strong> accepted your connection request</div>
          <div class="notif-time">${time}</div>
        </div>${dot}</div>`;
      return;
    }

    if (n.type === 'new_message') {
      const cnt = unreadMsgCount[n.fromUid] || 0;
      const badge = cnt > 1 ? ` <span class="notif-msg-count">${cnt}</span>` : '';
      const preview = n.preview ? `: <em>${escapeHTML(n.preview)}</em>` : '';
      html += `<div class="${cls}" onclick="openDMWith('${n.fromUid}')">
        <div class="notif-icon">💬</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${escapeHTML(n.fromName||'Someone')}</strong> sent you a message${preview}${badge}</div>
          <div class="notif-time">${time}</div>
        </div>${dot}</div>`;
      return;
    }

    // Generic
    html += `<div class="${cls}">
      <div class="notif-icon">🔔</div>
      <div class="notif-body">
        <div class="notif-text">${escapeHTML(n.text || 'New notification')}</div>
        <div class="notif-time">${time}</div>
      </div>${dot}</div>`;
  });

  container.innerHTML = html;
}

/* ════════════════════════════════════════════════════════
   NOTIF BADGE WATCHER
   - Listens live on Firebase
   - Excludes new_message (msg badge handles those)
   - Dedupes connection_request per sender
════════════════════════════════════════════════════════ */
function startNotifWatch() {
  if (!currentUser) return;
  window.XF.on('notifications/' + currentUser.uid, snap => {
    if (!snap.exists()) { _setBadge('notif', 0); return; }
    const all = [];
    snap.forEach(c => all.push(c.val()));
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const seen = new Set();
    let count = 0;
    all.forEach(n => {
      if (n.read) return;
      if (n.type === 'new_message') return; // handled by msg badge
      if (n.type === 'connection_request') {
        if (seen.has(n.fromUid)) return;
        seen.add(n.fromUid);
      }
      count++;
    });
    _setBadge('notif', count);
    if (activePage === 'notifications') renderNotifications();
  });
}

/* ════════════════════════════════════════════════════════
   MSG BADGE — live watcher per conversation
════════════════════════════════════════════════════════ */
let _msgWatchers = []; // cleanup handles

async function startMsgWatch() {
  if (!currentUser) return;
  // Watch my connections list — re-setup per-conversation watchers when it changes
  window.XF.on('connections/' + currentUser.uid, async connSnap => {
    // Tear down previous conversation watchers
    _msgWatchers.forEach(off => { try { off(); } catch (e) {} });
    _msgWatchers = [];

    if (!connSnap.exists()) { _setBadge('msg', 0); return; }

    const uids = Object.keys(connSnap.val());
    uids.forEach(uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const dmPath = 'dms/' + convId;

      // Timestamp guard — child_added replays ALL existing children on first
      // attach. We record the time we started listening and skip anything older,
      // so only genuinely new messages trigger popups/badge/preview updates.
      const watchStarted = Date.now();

      const addedHandler = async snap => {
        const m = snap.val();
        if (!m) return;

        const isNew = (m.createdAt || 0) >= watchStarted;

        // Always refresh badge (covers unread count for existing msgs too on re-attach)
        refreshMsgBadge();

        // Refresh conv list preview if on messages page
        if (activePage === 'messages' && $('messagesListView') &&
            $('messagesListView').style.display !== 'none') {
          renderConversations();
        }

        // Only show popup for genuinely new incoming messages
        if (isNew &&
            activeConvUid !== uid &&
            m.senderUid !== currentUser.uid &&
            (!m.readBy || !m.readBy[currentUser.uid])) {
          try {
            const pSnap = await window.XF.get('users/' + uid);
            const prof = pSnap.exists() ? pSnap.val() : { displayName: 'New message' };
            showMsgPopup(uid, prof, m.imageUrl ? '📷 Photo' : (m.text || ''));
          } catch (e) {}
        }
      };

      // child_changed handles read-receipt updates → badge recalc
      const changedHandler = () => refreshMsgBadge();

      // Use XF.onChild so listeners are registered in the stable registry
      // and unsub functions actually work
      const unsubAdded   = window.XF.onChild(dmPath, 'child_added',   addedHandler);
      const unsubChanged = window.XF.onChild(dmPath, 'child_changed', changedHandler);

      _msgWatchers.push(() => { unsubAdded(); unsubChanged(); });
    });

    refreshMsgBadge();
  });
}

async function refreshMsgBadge() {
  if (!currentUser) return;
  try {
    const connSnap = await window.XF.get('connections/' + currentUser.uid);
    if (!connSnap.exists()) { _setBadge('msg', 0); return; }
    let total = 0;
    const uids = Object.keys(connSnap.val());
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

/* ════════════════════════════════════════════════════════
   IN-APP MESSAGE POPUP
   - Slides in from top
   - Tap anywhere → open chat
   - Tap ✕ → close only
   - Auto-dismiss after 5s
════════════════════════════════════════════════════════ */
let _popupDismiss = null;

function showMsgPopup(uid, profile, text) {
  // Remove any existing popup first
  document.querySelectorAll('.msg-popup').forEach(el => el.remove());
  clearTimeout(_popupDismiss);

  const popup = document.createElement('div');
  popup.className = 'msg-popup';
  popup.innerHTML = `
    <div class="msg-popup-avatar">${avatarHTML(profile, 'sm')}</div>
    <div class="msg-popup-body">
      <div class="msg-popup-name">${escapeHTML(profile.displayName || 'New message')}</div>
      <div class="msg-popup-preview">${escapeHTML((text || '').slice(0, 60))}</div>
    </div>
    <div class="msg-popup-close">✕</div>`;

  function dismiss() {
    clearTimeout(_popupDismiss);
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 350);
  }

  popup.querySelector('.msg-popup-close').addEventListener('click', e => {
    e.stopPropagation();
    dismiss();
  });
  popup.addEventListener('click', () => {
    dismiss();
    openDMWith(uid);
  });

  document.body.appendChild(popup);
  requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add('visible')));
  _popupDismiss = setTimeout(dismiss, 5000);
}
