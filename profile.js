// profile.js — X Club v7 — Own Profile, User Profile, Viewers, Share
'use strict';

/* ══════════════════════════════════════════════
   OWN PROFILE
══════════════════════════════════════════════ */
async function renderOwnProfile() {
  if (!currentUser || !currentProfile) { showPage('login'); return; }
  const container = $('ownProfileContent'); if (!container) return;
  const postsSnap = await window.XF.get('posts'); const posts = [];
  if (postsSnap.exists()) postsSnap.forEach(c => { const p = c.val(); if (p.authorUid === currentUser.uid) posts.push({ id: c.key, ...p }); });
  posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const followersVisible = !currentProfile.followersHidden;
  container.innerHTML = `
    <div class="profile-banner" style="position:relative">
      ${currentProfile.bannerURL ? `<img src="${currentProfile.bannerURL}" style="width:100%;height:100%;object-fit:cover">` : '<div style="width:100%;height:100%;background:var(--bg-3)"></div>'}
      <label style="position:absolute;bottom:10px;right:10px;cursor:pointer;background:rgba(0,0,0,0.7);color:#fff;border-radius:9999px;padding:6px 12px;font-size:0.78rem;font-weight:600;display:flex;align-items:center;gap:4px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Cover<input type="file" accept="image/*" style="display:none" onchange="uploadBannerPhoto(this)">
      </label>
    </div>
    <div class="profile-info-section">
      <div class="profile-name-row">
        <div class="profile-avatar-wrap" style="position:relative">
          ${avatarHTML(currentProfile, 'xl')}
          <label style="position:absolute;bottom:0;right:0;cursor:pointer;background:var(--bg-3);border:2px solid var(--bg);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center" title="Change photo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><input type="file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this)">
          </label>
        </div>
        <div style="display:flex;gap:8px;padding-top:12px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="showEditProfile()">Edit profile</button>
          <button class="btn btn-outline btn-sm" onclick="shareProfile()" title="Share profile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          ${!currentProfile.verified ? `<button class="btn btn-accent btn-sm" onclick="showPaywall()">✓ Get Verified</button>` : ''}
        </div>
      </div>
      <div class="profile-name">${escapeHTML(currentProfile.displayName || 'Member')}${verifiedBadge(currentProfile.verified, true)}</div>
      <div class="profile-handle">@${escapeHTML(currentProfile.handle || 'member')}</div>
      ${currentProfile.bio ? `<div class="profile-bio">${escapeHTML(currentProfile.bio)}</div>` : '<div class="profile-bio text-dim">No bio yet</div>'}
      <div class="profile-stats">
        <div class="profile-stat"><strong>${formatCount(currentProfile.followersCount || 0)}</strong> <span>Followers</span></div>
        <div class="profile-stat"><strong>${formatCount(currentProfile.followingCount || 0)}</strong> <span>Following</span></div>
        <div class="profile-stat"><strong>${formatCount(currentProfile.postsCount || 0)}</strong> <span>Posts</span></div>
      </div>
      <div class="privacy-toggle-row">
        <span class="privacy-toggle-label">⊛ Show my followers publicly</span>
        <label class="toggle-switch">
          <input type="checkbox" ${followersVisible ? 'checked' : ''} onchange="toggleFollowersPrivacy(this.checked)">
          <div class="toggle-track"></div><div class="toggle-thumb"></div>
        </label>
      </div>
    </div>
    <div class="profile-tabs">
      <div class="profile-tab active" onclick="switchOwnProfileTab('posts',this)">Posts</div>
      <div class="profile-tab" onclick="switchOwnProfileTab('media',this)">Media</div>
    </div>
    <div id="ownProfilePosts">
      ${posts.length === 0 ? '<div class="empty-state"><div class="empty-state-desc">No posts yet — share something!</div></div>' : posts.map(p => p.type === 'business' ? businessPostHTML(p, currentProfile) : postHTML(p, currentProfile)).join('')}
    </div>`;
  setTimeout(() => makeProfilePhotosClickable(container, currentProfile), 50);
  renderProfileViewers(currentUser.uid, container);
}

function switchOwnProfileTab(tab, el) {
  document.querySelectorAll('#ownProfileContent .profile-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const container = $('ownProfilePosts'); if (!container) return;
  container.querySelectorAll('.post').forEach(p => { p.style.display = (tab === 'media' && !p.querySelector('.post-image')) ? 'none' : ''; });
}

async function uploadProfilePhoto(input) {
  if (!input.files[0]) return; showToast('Uploading photo…');
  try {
    const r = await window.XCloud.upload(input.files[0], 'x_profiles');
    await window.XF.update('users/' + currentUser.uid, { photoURL: r.url });
    await window.XF.updateProfile({ photoURL: r.url });
    currentProfile.photoURL = r.url; showToast('Profile photo updated!');
    renderOwnProfile(); updateNavUser(); updateComposerAvatar();
  } catch (err) { showToast('Upload failed: ' + err.message); }
}

async function uploadBannerPhoto(input) {
  if (!input.files[0]) return; showToast('Uploading cover…');
  try {
    const r = await window.XCloud.upload(input.files[0], 'x_banners');
    await window.XF.update('users/' + currentUser.uid, { bannerURL: r.url });
    currentProfile.bannerURL = r.url; showToast('Cover photo updated!'); renderOwnProfile();
  } catch (err) { showToast('Upload failed: ' + err.message); }
}

function showEditProfile() {
  if (!currentProfile) return;
  $('editDisplayName').value = currentProfile.displayName || '';
  $('editBio').value = currentProfile.bio || '';
  const hf = $('editHandle'); if (hf) hf.value = currentProfile.handle || '';
  $('editProfileModal').classList.add('open');
}

async function saveProfile() {
  const name = $('editDisplayName').value.trim(), bio = $('editBio').value.trim();
  if (!name) return showToast('Name cannot be empty');
  const updates = { displayName: name, bio };
  const hf = $('editHandle');
  if (hf) {
    const newHandle = hf.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (newHandle && newHandle !== currentProfile.handle) {
      if (newHandle.length < 3) { showToast('Handle must be at least 3 characters'); return; }
      const snap = await window.XF.get('handles/' + newHandle);
      if (snap.exists()) { showToast('@' + newHandle + ' is already taken'); return; }
      await window.XF.remove('handles/' + currentProfile.handle);
      await window.XF.set('handles/' + newHandle, currentUser.uid);
      updates.handle = newHandle;
    }
  }
  await window.XF.update('users/' + currentUser.uid, updates);
  await window.XF.updateProfile({ displayName: name });
  Object.assign(currentProfile, updates);
  closeModal('editProfileModal'); showToast('Profile updated'); renderOwnProfile(); updateNavUser();
}

async function toggleFollowersPrivacy(checked) {
  if (!currentUser) return;
  await window.XF.update('users/' + currentUser.uid, { followersHidden: !checked });
  currentProfile.followersHidden = !checked;
  showToast(checked ? 'Followers list is now public' : 'Followers list hidden');
}

/* ══════════════════════════════════════════════
   USER PROFILE
══════════════════════════════════════════════ */
async function openUserProfile(uid, e) {
  if (e) e.stopPropagation();
  if (uid === currentUser?.uid) { showPage('profile'); return; }
  showPage('user-profile', { uid });
}

async function renderUserProfile(uid) {
  const container = $('userProfileContent'); if (!container || !uid) return;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const blocked = await isBlocked(uid);
    const snap = await window.XF.get('users/' + uid);
    if (!snap.exists()) { container.innerHTML = '<div class="empty-state"><div class="empty-state-title">User not found</div></div>'; return; }
    const profile = snap.val();
    if (blocked) {
      container.innerHTML = `<div class="empty-state" style="padding:48px 24px">
        <div class="empty-state-icon" style="font-size:2.5rem">🚫</div>
        <div class="empty-state-title">You've blocked this user</div>
        <div class="empty-state-desc">They can't see your content and you won't see theirs.</div>
        <button class="btn btn-outline btn-sm" style="margin-top:20px" onclick="unblockUser('${uid}','${escapeHTML(profile.displayName || 'Member')}').then(()=>renderUserProfile('${uid}'))">Unblock</button>
      </div>`;
      return;
    }
    let connStatus = 'none';
    let incomingReqId = null;
    if (currentUser) {
      const cs = await window.XF.get('connections/' + currentUser.uid + '/' + uid);
      if (cs.exists()) {
        connStatus = 'connected';
      } else {
        const rs1 = await window.XF.get('connectionRequests/' + currentUser.uid + '_' + uid);
        const rs2 = await window.XF.get('connectionRequests/' + uid + '_' + currentUser.uid);
        if (rs1.exists() && rs1.val().status === 'pending') { connStatus = 'pending'; }
        else if (rs2.exists() && rs2.val().status === 'pending') { connStatus = 'incoming'; incomingReqId = uid + '_' + currentUser.uid; }
      }
    }
    const postsSnap = await window.XF.get('posts'); const posts = [];
    if (postsSnap.exists()) postsSnap.forEach(c => { const p = c.val(); if (p.authorUid === uid) posts.push({ id: c.key, ...p }); });
    posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const followersHidden = profile.followersHidden && uid !== currentUser?.uid;
    container.innerHTML = `
      <div class="profile-banner">
        ${profile.bannerURL ? `<img src="${profile.bannerURL}" style="width:100%;height:100%;object-fit:cover">` : '<div style="width:100%;height:100%;background:var(--bg-3)"></div>'}
      </div>
      <div class="profile-info-section">
        <div class="profile-name-row">
          <div class="profile-avatar-wrap">${avatarHTML(profile, 'xl')}</div>
          <div style="display:flex;gap:8px;padding-top:12px;flex-wrap:wrap">
            ${currentUser && uid !== currentUser.uid ? connStatus === 'incoming'
              ? `<button class="btn btn-primary btn-sm" onclick="acceptConnectionFromProfile('${incomingReqId}','${uid}',this)">✓ Accept</button><button class="btn btn-outline btn-sm" onclick="declineConnection('${incomingReqId}').then(()=>renderUserProfile('${uid}'))">Decline</button>`
              : connectBtnHTML(uid, connStatus) : ''}
            ${!currentUser ? `<button class="btn btn-primary btn-sm" onclick="showPage('register')">Connect</button>` : ''}
            ${connStatus === 'connected' ? `<button class="btn btn-outline btn-sm" onclick="openDMWith('${uid}')">Message</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="shareUserProfile('${uid}','${escapeHTML(profile.displayName || 'Member')}','${escapeHTML(profile.handle || uid)}')" title="Share profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            ${currentUser && uid !== currentUser.uid ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="blockUser('${uid}','${escapeHTML(profile.displayName || 'Member')}')">🚫 Block</button>` : ''}
          </div>
        </div>
        <div class="profile-name">${escapeHTML(profile.displayName || 'Member')}${verifiedBadge(profile.verified, true)}</div>
        <div class="profile-handle">@${escapeHTML(profile.handle || 'member')}</div>
        ${profile.bio ? `<div class="profile-bio">${escapeHTML(profile.bio)}</div>` : ''}
        <div class="profile-stats">
          <div class="profile-stat"><strong>${followersHidden ? '⊘' : formatCount(profile.followersCount || 0)}</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong>${formatCount(profile.followingCount || 0)}</strong> <span>Following</span></div>
          <div class="profile-stat"><strong>${formatCount(profile.postsCount || 0)}</strong> <span>Posts</span></div>
        </div>
      </div>
      <div class="profile-tabs">
        <div class="profile-tab active" onclick="switchUserProfileTab('posts',this)">Posts</div>
        <div class="profile-tab" onclick="switchUserProfileTab('media',this)">Media</div>
      </div>
      <div id="userProfilePosts">
        ${posts.length === 0 ? '<div class="empty-state"><div class="empty-state-desc">No posts yet</div></div>' : posts.map(p => p.type === 'business' ? businessPostHTML(p, profile) : postHTML(p, profile)).join('')}
      </div>`;
    recordProfileView(uid);
    setTimeout(() => makeProfilePhotosClickable(container, profile), 50);
    renderProfileViewers(uid, container);
  } catch (err) { container.innerHTML = '<div class="empty-state"><div class="empty-state-desc">Could not load profile</div></div>'; }
}

function switchUserProfileTab(tab, el) {
  document.querySelectorAll('#userProfileContent .profile-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const container = $('userProfilePosts'); if (!container) return;
  container.querySelectorAll('.post').forEach(p => { p.style.display = (tab === 'media' && !p.querySelector('.post-image')) ? 'none' : ''; });
}

/* ══════════════════════════════════════════════
   PROFILE VIEWERS (TikTok-style)
══════════════════════════════════════════════ */
async function recordProfileView(profileUid) {
  if (!currentUser || profileUid === currentUser.uid) return;
  try {
    await window.XF.set('profileViews/' + profileUid + '/' + currentUser.uid, { uid: currentUser.uid, displayName: currentProfile?.displayName || 'Member', handle: currentProfile?.handle || 'member', photoURL: currentProfile?.photoURL || '', viewedAt: window.XF.ts() });
  } catch (e) {}
}

async function renderProfileViewers(profileUid, containerEl) {
  if (!currentUser || profileUid !== currentUser.uid) return;
  try {
    const snap = await window.XF.get('profileViews/' + profileUid);
    if (!snap.exists()) return;
    const viewers = []; snap.forEach(c => viewers.push(c.val()));
    viewers.sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
    const recent = viewers.slice(0, 5);
    if (recent.length === 0) return;
    const strip = document.createElement('div'); strip.className = 'profile-viewers-strip';
    strip.innerHTML = `
      <div class="profile-viewers-avatars">${recent.map(v => avatarHTML(v, 'sm')).join('')}</div>
      <div class="profile-viewers-label">${recent.length} recent viewer${recent.length > 1 ? 's' : ''}</div>`;
    let panelOpen = false;
    strip.onclick = function (e) {
      e.stopPropagation();
      let panel = strip.querySelector('.profile-viewers-panel');
      if (panel) { panel.remove(); panelOpen = false; return; }
      panelOpen = true;
      panel = document.createElement('div'); panel.className = 'profile-viewers-panel';
      panel.innerHTML = viewers.slice(0, 10).map(v => `
        <div class="profile-viewer-row" onclick="openUserProfile('${v.uid}',event)">
          ${avatarHTML(v, 'sm')}
          <div>
            <div class="profile-viewer-name">${escapeHTML(v.displayName || 'Member')}</div>
            <div class="profile-viewer-handle">@${escapeHTML(v.handle || 'member')} · ${timeAgo(v.viewedAt)}</div>
          </div>
        </div>`).join('');
      strip.appendChild(panel);
      setTimeout(() => document.addEventListener('click', function h() { panel.remove(); document.removeEventListener('click', h); }, { once: true }), 50);
    };
    containerEl.insertBefore(strip, containerEl.firstChild);
  } catch (e) {}
}

/* ══════════════════════════════════════════════
   CLICKABLE PROFILE PHOTO + BANNER
══════════════════════════════════════════════ */
function makeProfilePhotosClickable(containerEl, profile) {
  const bannerEl = containerEl.querySelector('.profile-banner img');
  if (bannerEl) { bannerEl.style.cursor = 'pointer'; bannerEl.onclick = function (e) { e.stopPropagation(); openLightbox(profile.bannerURL); }; }
  const avatarEl = containerEl.querySelector('.profile-avatar-wrap img,.profile-avatar-wrap .avatar');
  if (avatarEl && profile.photoURL) { avatarEl.style.cursor = 'pointer'; avatarEl.onclick = function (e) { e.stopPropagation(); openLightbox(profile.photoURL); }; }
}

/* ══════════════════════════════════════════════
   SHARE PROFILE
══════════════════════════════════════════════ */
function shareProfile() {
  if (!currentProfile) return;
  const handle = currentProfile.handle || currentUser?.uid;
  const url = window.location.origin + window.location.pathname + '?user=' + encodeURIComponent(handle);
  if (navigator.share) {
    navigator.share({ title: currentProfile.displayName + ' — X-Musk Financial Club', text: 'Check out ' + currentProfile.displayName + ' on X-Musk Financial Club', url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => showToast('Profile link copied!')).catch(() => showToast('Link: ' + url));
  }
}

function shareUserProfile(uid, displayName, handle) {
  const url = window.location.origin + window.location.pathname + '?user=' + encodeURIComponent(handle || uid);
  if (navigator.share) {
    navigator.share({ title: (displayName || 'Member') + ' — X-Musk Financial Club', text: 'Check out ' + (displayName || 'Member') + ' on X-Musk Financial Club', url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => showToast('Profile link copied!')).catch(() => showToast('Link: ' + url));
  }
}
