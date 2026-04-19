// router.js — X Club v7 — SPA Page Routing & Back Stack
// Load order: 3rd (after config.js, utils.js)
'use strict';

/* ══════════════════════════════════════════════
   PAGE ROUTING  (proper SPA back stack)
══════════════════════════════════════════════ */
const _pageStack = [];
let _suppressPopstate = false;

function showPage(name, opts = {}) {
  if (name === 'feed' && !currentUser) name = 'landing';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = $('page-' + name); if (pg) pg.classList.add('active');
  activePage = name; updateNavActive(); window.scrollTo(0, 0);
  if (name === 'feed') renderFeed();
  else _teardownFeed();
  if (name === 'discover') renderDiscover();
  if (name === 'notifications') renderNotifications();
  if (name === 'messages') renderConversations();
  if (name === 'profile') renderOwnProfile();
  if (name === 'user-profile') renderUserProfile(opts.uid);
  if (name === 'post-detail') renderPostDetail(opts.postId);
  if (!['landing', 'login', 'register', 'reset'].includes(name)) {
    const top = _pageStack[_pageStack.length - 1];
    const isDuplicate = top && top.name === name && JSON.stringify(top.opts) === JSON.stringify(opts);
    if (!isDuplicate) {
      _pageStack.push({ name, opts });
      _suppressPopstate = true;
      window.history.pushState({ page: name, opts }, '', window.location.pathname);
      _suppressPopstate = false;
    }
  }
}

function goBack() {
  _pageStack.pop();
  const prev = _pageStack[_pageStack.length - 1];
  if (prev) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = $('page-' + prev.name); if (pg) pg.classList.add('active');
    activePage = prev.name; updateNavActive(); window.scrollTo(0, 0);
    if (prev.name === 'user-profile') renderUserProfile(prev.opts?.uid);
    else if (prev.name === 'feed') renderFeed();
    else if (prev.name === 'discover') renderDiscover();
    else if (prev.name === 'profile') renderOwnProfile();
    else if (prev.name === 'post-detail') renderPostDetail(prev.opts?.postId);
    else if (prev.name === 'notifications') renderNotifications();
    else if (prev.name === 'messages') renderConversations();
  } else showPage('feed');
}

window.addEventListener('popstate', () => {
  if (_suppressPopstate) return;
  if ($('dmFullpage') && $('dmFullpage').style.display !== 'none') {
    closeDMFullpage();
    window.history.pushState({}, '', window.location.pathname);
    return;
  }
  goBack();
  window.history.pushState({}, '', window.location.pathname);
});

function updateNavActive() {
  document.querySelectorAll('.nav-link,.mobile-nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === activePage));
}
