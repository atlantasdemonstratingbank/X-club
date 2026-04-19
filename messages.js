// messages.js — X Club v7 — WhatsApp-Style DM (image only, no video/call)
'use strict';

/* ══════════════════════════════════════════════
   CONVERSATION LIST
══════════════════════════════════════════════ */
async function renderConversations() {
  const container = $('convList');
  if (!container) return;
  const lv = $('messagesListView'), dp = $('dmFullpage');
  if (lv) lv.style.display = 'block';
  if (dp) dp.style.display = 'none';
  if (!currentUser) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const connSnap = await window.XF.get('connections/' + currentUser.uid);
    if (!connSnap.exists() || Object.keys(connSnap.val()).length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:32px 16px"><div class="empty-state-icon">◈</div><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">Connect with members to start chatting</div></div>';
      return;
    }
    const uids = Object.keys(connSnap.val());
    const profiles = {};
    await Promise.all(uids.map(async uid => { const s = await window.XF.get('users/' + uid); if (s.exists()) profiles[uid] = s.val(); }));
    const previews = {}, unreadCounts = {};
    await Promise.all(uids.map(async uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const dmSnap = await window.XF.db.ref('dms/' + convId).orderByChild('createdAt').limitToLast(50).once('value');
      if (dmSnap.exists()) {
        const msgs = []; dmSnap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
        if (msgs.length > 0) previews[uid] = msgs[msgs.length - 1];
        unreadCounts[uid] = msgs.filter(m => m.senderUid !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])).length;
      }
    }));
    container.innerHTML = uids.map(uid => {
      const p = profiles[uid]; if (!p) return '';
      const preview = previews[uid];
      const unread = unreadCounts[uid] || 0;
      const previewText = preview ? (preview.imageUrl ? '📷 Photo' : String(preview.text || '').slice(0, 40)) : 'Start a conversation';
      const ts = preview?.createdAt ? timeAgo(preview.createdAt) : '';
      return `<div class="conversation-item${unread > 0 ? ' unread-conv' : ''}" onclick="openDMWith('${uid}')" data-uid="${uid}">
        ${avatarHTML(p, 'md')}
        <div class="conv-info">
          <div class="conv-name-row">
            <div class="conv-name${unread > 0 ? ' conv-name-bold' : ''}">${escapeHTML(p.displayName || 'Member')}${verifiedBadge(p.verified)}</div>
            ${ts ? `<div class="conv-time">${ts}</div>` : ''}
          </div>
          <div class="conv-preview-row">
            <div class="conv-preview${unread > 0 ? ' conv-preview-unread' : ''}">${escapeHTML(previewText)}</div>
            ${unread > 0 ? `<div class="conv-unread-badge">${unread}</div>` : ''}
          </div>
        </div>
      </div>`;
    }).filter(Boolean).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load conversations</div></div>';
  }
}

/* ══════════════════════════════════════════════
   DM FULLPAGE — WHATSAPP STYLE
══════════════════════════════════════════════ */
let _typingUnsubscribe = null, _typingTimer = null;
let _dmPartner = null;
let _dmEmojiOpen = false;

// Emoji quick-picker list
const DM_EMOJIS = ['❤️','😂','😮','😢','😡','👍','👎','🔥','🎉','💯','😍','🙏','💪','✅','😭','🤣','😁','🥳','👏','💀'];
const QUICK_REACTIONS = ['❤️','😂','👍','😮','😢','😡'];

async function openDMWith(uid) {
  if (msgUnsubscribe) { try { msgUnsubscribe(); } catch (e) {} msgUnsubscribe = null; }
  if (_typingUnsubscribe) { try { _typingUnsubscribe(); } catch (e) {} } _typingUnsubscribe = null;

  if (activePage !== 'messages') showPage('messages');
  activeConvUid = uid;

  const snap = await window.XF.get('users/' + uid);
  _dmPartner = snap.exists() ? snap.val() : null;

  const lv = $('messagesListView'), dp = $('dmFullpage');
  if (lv) lv.style.display = 'none';
  if (!dp) return;
  dp.style.display = 'flex';

  // Header
  const hdr = $('dmFullpageHeader');
  if (hdr) hdr.innerHTML = `
    <div class="dm-back-btn" onclick="closeDMFullpage()">←</div>
    <div onclick="openUserProfile('${uid}',event)" style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1">
      ${avatarHTML(_dmPartner, 'md')}
      <div>
        <div style="display:flex;align-items:center;gap:4px;font-weight:700">${escapeHTML(_dmPartner?.displayName || 'Member')}${verifiedBadge(_dmPartner?.verified)}</div>
        <div style="font-size:0.8rem;color:var(--text-dim)" id="dmOnlineStatus">@${escapeHTML(_dmPartner?.handle || 'member')}</div>
      </div>
    </div>`;

  // Wire input
  const dmInput = $('dmInput');
  if (dmInput) {
    dmInput.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDMText(uid); } };
    dmInput.oninput = function () { sendTypingIndicator(uid); updateSendBtn(); };
    dmInput.value = '';
  }

  // Wire send btn
  const sendBtn = dp.querySelector('.dm-send-btn');
  if (sendBtn) sendBtn.onclick = function () { sendDMText(uid); };

  // Wire image input
  const imgInput = $('dmImgInput');
  if (imgInput) { imgInput.value = ''; imgInput.onchange = function () { handleDMImagePreview(this, uid); }; }

  // Wire emoji btn
  const emojiBtn = $('dmEmojiBtn');
  if (emojiBtn) emojiBtn.onclick = function (e) { e.stopPropagation(); toggleEmojiPicker(); };

  // Close emoji picker when clicking outside
  document.addEventListener('click', function closeEmoji(e) {
    const picker = $('dmEmojiPicker');
    if (picker && !picker.contains(e.target) && e.target.id !== 'dmEmojiBtn') {
      picker.style.display = 'none'; _dmEmojiOpen = false;
    }
  });

  const convId = [currentUser.uid, uid].sort().join('_');

  // Typing indicator listener
  _typingUnsubscribe = window.XF.on('typing/' + convId + '/' + uid, function (tSnap) {
    const statusEl = $('dmOnlineStatus'); if (!statusEl) return;
    if (tSnap.exists() && tSnap.val() === true) {
      statusEl.innerHTML = '<span style="color:var(--success);font-size:0.78rem">● typing…</span>';
    } else {
      statusEl.textContent = '@' + escapeHTML(_dmPartner?.handle || 'member'); statusEl.style.color = 'var(--text-dim)';
    }
  });

  // Real-time message listener — no _rendering guard (it blocks updates)
  let _readDebounce = null;
  msgUnsubscribe = (function () {
    const ref = window.XF.db.ref('dms/' + convId).orderByChild('createdAt').limitToLast(100);
    const handler = function (msgSnap) {
      const msgEl = $('dmMessages');
      if (!msgEl) return;
      const msgs = [];
      if (msgSnap.exists()) msgSnap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
      if (msgs.length === 0) {
        msgEl.innerHTML = '<div class="dm-empty-state">Say hello! 👋</div>';
        return;
      }
      const wasAtBottom = msgEl.scrollHeight - msgEl.scrollTop - msgEl.clientHeight < 120;
      try {
        msgEl.innerHTML = renderMessagesHTML(msgs, uid, convId);
      } catch (err) {
        console.error('[DM] render error:', err);
        return;
      }
      if (wasAtBottom) msgEl.scrollTop = msgEl.scrollHeight;
      clearTimeout(_readDebounce);
      _readDebounce = setTimeout(function () {
        if (activeConvUid === uid) markMessagesRead(convId);
      }, 800);
    };
    ref.on('value', handler);
    return function () { ref.off('value', handler); };
  })();
}

/* ══════════════════════════════════════════════
   RENDER MESSAGES HTML (WhatsApp layout)
══════════════════════════════════════════════ */
function renderMessagesHTML(msgs, uid, convId) {
  let html = '';
  let lastDate = '';

  msgs.forEach(function (m) {
    const isMe = m.senderUid === currentUser.uid;

    // Date separator
    const msgDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : '';
    if (msgDate && msgDate !== lastDate) {
      html += `<div class="dm-date-sep"><span>${msgDate}</span></div>`;
      lastDate = msgDate;
    }

    // Starred indicator
    const isStarred = m.starred && m.starred[currentUser.uid];

    // Reactions row
    let reactionsHTML = '';
    if (m.reactions && Object.keys(m.reactions).length > 0) {
      const counts = {};
      Object.values(m.reactions).forEach(r => { counts[r] = (counts[r] || 0) + 1; });
      reactionsHTML = `<div class="dm-reactions">${Object.entries(counts).map(([emoji, count]) =>
        `<span class="dm-reaction-pill${m.reactions[currentUser.uid] === emoji ? ' mine' : ''}" onclick="toggleReaction('${convId}','${m.id}','${emoji}')">${emoji}${count > 1 ? ' ' + count : ''}</span>`
      ).join('')}</div>`;
    }

    // Reply reference
    let replyHTML = '';
    if (m.replyTo) {
      replyHTML = `<div class="dm-reply-ref" onclick="scrollToMsg('${m.replyTo.id}')">
        <div class="dm-reply-ref-name">${escapeHTML(m.replyTo.senderName || 'Message')}</div>
        <div class="dm-reply-ref-text">${m.replyTo.imageUrl ? '📷 Photo' : escapeHTML((m.replyTo.text || '').slice(0, 50))}</div>
      </div>`;
    }

    // Message content
    let contentHTML = '';
    if (m.imageUrl) contentHTML += `<img src="${escapeHTML(m.imageUrl)}" loading="lazy" onclick="openLightbox('${escapeHTML(m.imageUrl)}')" alt="photo" class="dm-msg-image">`;
    if (m.text) contentHTML += `<span class="dm-msg-text">${escapeHTML(m.text)}</span>`;

    // Read ticks
    let statusHTML = '';
    if (isMe) {
      const isRead = m.readBy && Object.keys(m.readBy).some(k => k !== currentUser.uid);
      statusHTML = `<span class="msg-tick${isRead ? ' read' : ' sent'}" title="${isRead ? 'Read' : 'Sent'}">✓✓</span>`;
    }

    const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    html += `<div class="chat-msg-wrap${isMe ? ' me' : ' them'}" id="msg-${m.id}"
      data-msgid="${m.id}" data-convid="${convId}" data-sender="${isMe ? 'me' : 'them'}"
      oncontextmenu="showMsgMenu(event,this)"
      ontouchstart="startMsgHold(event,this)" ontouchend="cancelMsgHold()" ontouchmove="cancelMsgHold()">
      ${!isMe ? `<div class="chat-msg-avatar">${avatarHTML(_dmPartner, 'sm')}</div>` : ''}
      <div class="chat-msg-col">
        ${replyHTML}
        <div class="chat-msg${isMe ? ' me' : ' them'}">
          ${isStarred ? '<span class="dm-star-badge" title="Starred">⭐</span>' : ''}
          ${contentHTML}
          <div class="dm-msg-footer">
            <span class="dm-msg-time">${timeStr}</span>
            ${statusHTML}
          </div>
        </div>
        ${reactionsHTML}
      </div>
    </div>`;
  });

  return html;
}

/* ══════════════════════════════════════════════
   EMOJI PICKER
══════════════════════════════════════════════ */
function toggleEmojiPicker() {
  const picker = $('dmEmojiPicker');
  if (!picker) return;
  _dmEmojiOpen = !_dmEmojiOpen;
  picker.style.display = _dmEmojiOpen ? 'flex' : 'none';
}

function insertEmoji(emoji) {
  const input = $('dmInput'); if (!input) return;
  const pos = input.selectionStart || input.value.length;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  input.focus();
  input.selectionStart = input.selectionEnd = pos + emoji.length;
  updateSendBtn();
  const picker = $('dmEmojiPicker'); if (picker) { picker.style.display = 'none'; _dmEmojiOpen = false; }
}

function updateSendBtn() {
  const input = $('dmInput'), btn = document.querySelector('.dm-send-btn');
  if (!btn) return;
  const hasText = input?.value?.trim().length > 0;
  const hasImg = $('dmImgPreview')?.innerHTML?.trim().length > 0;
  btn.style.opacity = (hasText || hasImg) ? '1' : '0.5';
}

/* ══════════════════════════════════════════════
   MESSAGE CONTEXT MENU (long-press / right-click)
══════════════════════════════════════════════ */
let _msgHoldTimer = null;
let _activeReplyMsg = null;

function startMsgHold(e, el) { _msgHoldTimer = setTimeout(function () { showMsgMenu(e, el); }, 500); }
function cancelMsgHold() { clearTimeout(_msgHoldTimer); }

function showMsgMenu(e, el) {
  e.preventDefault(); e.stopPropagation();
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  const msgId = el.dataset.msgid, convId = el.dataset.convid;
  const isMe = el.dataset.sender === 'me';
  if (!msgId || !convId) return;

  const menu = document.createElement('div');
  menu.className = 'msg-ctx-menu';

  // Quick reactions
  menu.innerHTML = `<div class="msg-ctx-reactions">${QUICK_REACTIONS.map(emoji =>
    `<span class="msg-ctx-reaction" onclick="toggleReaction('${convId}','${msgId}','${emoji}')">${emoji}</span>`
  ).join('')}</div>
  <div class="msg-ctx-item" onclick="replyToMsg('${convId}','${msgId}')">↩ Reply</div>
  <div class="msg-ctx-item" onclick="starMsg('${convId}','${msgId}')">⭐ Star</div>
  <div class="msg-ctx-item" onclick="copyMsgText('${msgId}')">📋 Copy</div>
  <div class="msg-ctx-item" onclick="forwardMsg('${convId}','${msgId}')">↗ Forward</div>
  ${isMe ? `<div class="msg-ctx-item delete" onclick="deleteDMMessage('${convId}','${msgId}')">🗑 Delete</div>` : ''}`;

  const rect = el.getBoundingClientRect();
  menu.style.cssText = `position:fixed;top:${Math.min(rect.bottom + 4, window.innerHeight - 180)}px;${rect.left > window.innerWidth / 2 ? 'right:' + (window.innerWidth - rect.right) + 'px' : 'left:' + Math.max(8, rect.left) + 'px'};z-index:9999`;
  document.body.appendChild(menu);
  setTimeout(function () {
    document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }, { once: true });
  }, 50);
}

/* ══════════════════════════════════════════════
   MESSAGE ACTIONS
══════════════════════════════════════════════ */
async function toggleReaction(convId, msgId, emoji) {
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  if (!currentUser) return;
  try {
    const snap = await window.XF.get('dms/' + convId + '/' + msgId + '/reactions/' + currentUser.uid);
    if (snap.exists() && snap.val() === emoji) {
      await window.XF.remove('dms/' + convId + '/' + msgId + '/reactions/' + currentUser.uid);
    } else {
      await window.XF.set('dms/' + convId + '/' + msgId + '/reactions/' + currentUser.uid, emoji);
    }
  } catch (e) { showToast('Could not add reaction'); }
}

async function replyToMsg(convId, msgId) {
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  try {
    const snap = await window.XF.get('dms/' + convId + '/' + msgId);
    if (!snap.exists()) return;
    const msg = snap.val();
    _activeReplyMsg = { id: msgId, text: msg.text || '', imageUrl: msg.imageUrl || '', senderName: msg.senderUid === currentUser.uid ? 'You' : (_dmPartner?.displayName || 'Member') };
    const bar = $('dmReplyBar');
    if (bar) {
      bar.style.display = 'flex';
      const preview = bar.querySelector('.dm-reply-preview');
      if (preview) preview.innerHTML = `<strong>${escapeHTML(_activeReplyMsg.senderName)}</strong><br><span>${_activeReplyMsg.imageUrl ? '📷 Photo' : escapeHTML(_activeReplyMsg.text.slice(0, 60))}</span>`;
    }
    $('dmInput')?.focus();
  } catch (e) {}
}

function cancelReply() {
  _activeReplyMsg = null;
  const bar = $('dmReplyBar'); if (bar) bar.style.display = 'none';
}

async function starMsg(convId, msgId) {
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  if (!currentUser) return;
  try {
    const snap = await window.XF.get('dms/' + convId + '/' + msgId + '/starred/' + currentUser.uid);
    if (snap.exists()) { await window.XF.remove('dms/' + convId + '/' + msgId + '/starred/' + currentUser.uid); showToast('Star removed'); }
    else { await window.XF.set('dms/' + convId + '/' + msgId + '/starred/' + currentUser.uid, true); showToast('⭐ Message starred'); }
  } catch (e) {}
}

async function copyMsgText(msgId) {
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  const el = document.getElementById('msg-' + msgId);
  if (!el) return;
  const textEl = el.querySelector('.dm-msg-text');
  const text = textEl ? textEl.textContent : '';
  if (text) { navigator.clipboard?.writeText(text).then(() => showToast('Copied!')).catch(() => showToast('Copy failed')); }
}

async function forwardMsg(convId, msgId) {
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  showToast('Forward: select a conversation to forward to');
  // Simple implementation: show toast — full forward UI would need a contact picker
}

async function deleteDMMessage(convId, msgId) {
  document.querySelectorAll('.msg-ctx-menu').forEach(m => m.remove());
  try { await window.XF.remove('dms/' + convId + '/' + msgId); }
  catch (e) { showToast('Could not delete message'); }
}

function scrollToMsg(msgId) {
  const el = document.getElementById('msg-' + msgId);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('dm-msg-highlight'); setTimeout(() => el.classList.remove('dm-msg-highlight'), 1500); }
}

/* ══════════════════════════════════════════════
   SEND MESSAGE
══════════════════════════════════════════════ */
function sendTypingIndicator(uid) {
  if (!currentUser || !uid) return;
  const convId = [currentUser.uid, uid].sort().join('_');
  window.XF.set('typing/' + convId + '/' + currentUser.uid, true).catch(() => {});
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(function () {
    window.XF.set('typing/' + convId + '/' + currentUser.uid, false).catch(() => {});
  }, 2500);
}

async function markMessagesRead(convId) {
  if (!currentUser) return;
  try {
    const snap = await window.XF.get('dms/' + convId);
    if (!snap.exists()) return;
    const updates = {};
    snap.forEach(c => {
      const m = c.val();
      if (m.senderUid !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])) {
        updates['dms/' + convId + '/' + c.key + '/readBy/' + currentUser.uid] = true;
      }
    });
    if (Object.keys(updates).length > 0) { await window.XF.multiUpdate(updates); refreshMsgBadge(); }
  } catch (e) {}
}

async function refreshMsgBadge() {
  if (!currentUser) return;
  try {
    const connSnap = await window.XF.get('connections/' + currentUser.uid);
    if (!connSnap.exists()) return;
    const uids = Object.keys(connSnap.val());
    let total = 0;
    await Promise.all(uids.map(async uid => {
      const convId = [currentUser.uid, uid].sort().join('_');
      const dmSnap = await window.XF.get('dms/' + convId); if (!dmSnap.exists()) return;
      dmSnap.forEach(c => {
        const m = c.val();
        if (m.senderUid !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])) total++;
      });
    }));
    ['navMsgBadge', 'mobileMsgBadge'].forEach(id => {
      const b = $(id); if (!b) return;
      b.textContent = total; b.style.display = total > 0 ? 'flex' : 'none';
    });
  } catch (e) {}
}

async function sendDMText(uid) {
  uid = uid || activeConvUid;
  if (!uid || !currentUser) return;
  const input = $('dmInput');
  const text = input?.value?.trim();
  if (!text) return;

  // Daily message limit for unverified users
  if (!currentProfile?.verified) {
    const today = new Date().toISOString().slice(0, 10);
    const limitKey = 'xclub_msg_' + currentUser.uid + '_' + today;
    let sentToday = 0;
    try { sentToday = parseInt(localStorage.getItem(limitKey) || '0'); } catch (e) { sentToday = 0; }
    const DAILY_LIMIT = 10;
    if (sentToday >= DAILY_LIMIT) { showToast('Message limit reached — get verified for unlimited messages'); return; }
    try { localStorage.setItem(limitKey, String(sentToday + 1)); } catch (e) {}
    const remaining = DAILY_LIMIT - sentToday - 1;
    if (remaining <= 3) showToast(remaining + ' free messages remaining today');
  }

  if (input) input.value = '';
  updateSendBtn();
  const convId = [currentUser.uid, uid].sort().join('_');
  window.XF.set('typing/' + convId + '/' + currentUser.uid, false).catch(() => {});
  clearTimeout(_typingTimer);

  const msgData = {
    senderUid: currentUser.uid, text, createdAt: window.XF.ts(), readBy: { [currentUser.uid]: true }
  };
  if (_activeReplyMsg) { msgData.replyTo = _activeReplyMsg; cancelReply(); }

  try {
    await window.XF.push('dms/' + convId, msgData);
    notifyDMRecipient(uid, text);
    refreshMsgBadge();
  } catch (err) {
    if (input) input.value = text;
    showToast('Failed to send — check your connection');
  }
}

async function notifyDMRecipient(toUid, preview) {
  try {
    await window.XF.push('notifications/' + toUid, { type: 'new_message', fromUid: currentUser.uid, fromName: currentProfile?.displayName || 'Member', preview: (preview || '').slice(0, 40), createdAt: window.XF.ts(), read: false });
  } catch (e) {}
}

/* ══════════════════════════════════════════════
   IMAGE SEND
══════════════════════════════════════════════ */
function handleDMImagePreview(inputEl, uid) {
  if (!inputEl?.files?.[0]) return;
  const preview = $('dmImgPreview');
  if (preview) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.innerHTML = `<div class="img-preview-wrap" style="margin:6px 0 0 4px"><img src="${e.target.result}" style="max-width:120px;max-height:120px;border-radius:8px"><div class="img-preview-remove" onclick="cancelDMImage()">✕</div></div>`;
      updateSendBtn();
      // Auto-send image when selected
      sendDMImage(inputEl, uid);
    };
    reader.readAsDataURL(inputEl.files[0]);
  } else {
    sendDMImage(inputEl, uid);
  }
}

function cancelDMImage() {
  const p = $('dmImgPreview'); if (p) p.innerHTML = '';
  const i = $('dmImgInput'); if (i) i.value = '';
  updateSendBtn();
}

async function sendDMImage(inputEl, uid) {
  uid = uid || activeConvUid;
  if (!uid || !currentUser || !inputEl?.files?.[0]) return;
  const file = inputEl.files[0];
  showToast('Uploading image…');
  try {
    const r = await window.XCloud.upload(file, 'dm_images');
    const convId = [currentUser.uid, uid].sort().join('_');
    const msgData = { senderUid: currentUser.uid, imageUrl: r.url, text: '', createdAt: window.XF.ts(), readBy: { [currentUser.uid]: true } };
    if (_activeReplyMsg) { msgData.replyTo = _activeReplyMsg; cancelReply(); }
    await window.XF.push('dms/' + convId, msgData);
    inputEl.value = '';
    const p = $('dmImgPreview'); if (p) p.innerHTML = '';
    updateSendBtn();
    notifyDMRecipient(uid, '📷 Photo');
    refreshMsgBadge();
  } catch (e) {
    showToast('Failed to send image — check your connection');
  }
}

/* ══════════════════════════════════════════════
   CLOSE DM
══════════════════════════════════════════════ */
function closeDMFullpage() {
  if (msgUnsubscribe) { try { msgUnsubscribe(); } catch (e) {} msgUnsubscribe = null; }
  if (_typingUnsubscribe) { try { _typingUnsubscribe(); } catch (e) {} } _typingUnsubscribe = null;
  if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
  if (currentUser && activeConvUid) {
    const convId = [currentUser.uid, activeConvUid].sort().join('_');
    window.XF.set('typing/' + convId + '/' + currentUser.uid, false).catch(() => {});
  }
  cancelReply();
  activeConvUid = null; _dmPartner = null;
  const lv = $('messagesListView'), dp = $('dmFullpage');
  if (dp) dp.style.display = 'none';
  if (lv) lv.style.display = 'block';
  renderConversations();
}
