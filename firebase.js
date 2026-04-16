/* firebase.js — X Club Firebase Backend
   All Realtime DB paths are prefixed with "x_" to avoid collision with other apps. */
'use strict';

/* ── Firebase config (from config.js) ───────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDLPAktzLmpfNX9XUmw9i_B2P2I3XPwOLs',
  authDomain:        'viccybank.firebaseapp.com',
  databaseURL:       'https://viccybank-default-rtdb.firebaseio.com',
  projectId:         'viccybank',
  storageBucket:     'viccybank.firebasestorage.app',
  messagingSenderId: '328465601734',
  appId:             '1:328465601734:web:ae8d6bee3683be60629b32'
};

/* ── DB path constants (all prefixed x_) ────────────────────────────── */
const XDB = {
  users:       'x_users',          /* user profiles          */
  sessions:    'x_sessions',       /* active sessions        */
  chats:       'x_chats',          /* encrypted messages     */
  auctions:    'x_auctions',       /* live auction bids      */
  bids:        'x_bids',           /* per-user bid history   */
  events:      'x_events',         /* event RSVPs            */
  concierge:   'x_concierge',      /* concierge requests     */
  notifs:      'x_notifications',  /* push notification data */
  fcmTokens:   'x_fcm_tokens',     /* FCM device tokens      */
  applications:'x_applications',   /* membership applications*/
  network:     'x_network',        /* connection graph        */
  presence:    'x_presence',       /* online status          */
  appConfig:   'x_app_config'      /* remote config          */
};

/* ── SDK loading ─────────────────────────────────────────────────────── */
let _app, _auth, _db;

async function loadFirebaseSDKs() {
  const imports = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js')
  ]);
  const { initializeApp }                              = imports[0];
  const { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
          createUserWithEmailAndPassword, signOut,
          sendPasswordResetEmail, GoogleAuthProvider,
          signInWithPopup, updateProfile }             = imports[1];
  const { getDatabase, ref, set, get, push, update,
          remove, onValue, off, serverTimestamp,
          onDisconnect, query, orderByChild,
          limitToLast, equalTo }                       = imports[2];

  _app  = initializeApp(FIREBASE_CONFIG);
  _auth = getAuth(_app);
  _db   = getDatabase(_app);

  window._FB = {
    auth: _auth, db: _db,
    /* Auth */
    onAuthStateChanged, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, signOut,
    sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, updateProfile,
    /* DB helpers */
    ref, set, get, push, update, remove, onValue, off,
    serverTimestamp, onDisconnect, query,
    orderByChild, limitToLast, equalTo,
    /* Path constants */
    XDB
  };

  initPresence();
  return window._FB;
}

/* ── Auth helpers ────────────────────────────────────────────────────── */
async function xSignUp(email, password, displayName) {
  const { auth, createUserWithEmailAndPassword, updateProfile, db, ref, set, serverTimestamp } = window._FB;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await set(ref(db, `${XDB.users}/${cred.user.uid}`), {
    uid:          cred.user.uid,
    email,
    displayName,
    tier:         'pending',
    status:       'active',
    joinedAt:     serverTimestamp(),
    photoURL:     null,
    memberNumber: 'XC-' + Date.now().toString(36).toUpperCase()
  });
  await xSaveFCMToken(cred.user.uid);
  return cred.user;
}

async function xSignIn(email, password) {
  const { auth, signInWithEmailAndPassword } = window._FB;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await xSaveFCMToken(cred.user.uid);
  return cred.user;
}

async function xSignInGoogle() {
  const { auth, GoogleAuthProvider, signInWithPopup, db, ref, get, set, serverTimestamp } = window._FB;
  const provider = new GoogleAuthProvider();
  const cred     = await signInWithPopup(auth, provider);
  const snap     = await get(ref(db, `${XDB.users}/${cred.user.uid}`));
  if (!snap.exists()) {
    await set(ref(db, `${XDB.users}/${cred.user.uid}`), {
      uid:          cred.user.uid,
      email:        cred.user.email,
      displayName:  cred.user.displayName,
      photoURL:     cred.user.photoURL,
      tier:         'pending',
      status:       'active',
      joinedAt:     serverTimestamp(),
      memberNumber: 'XC-' + Date.now().toString(36).toUpperCase()
    });
  }
  await xSaveFCMToken(cred.user.uid);
  return cred.user;
}

async function xSignOut() {
  const { auth, signOut, db, ref, remove } = window._FB;
  const uid = auth.currentUser?.uid;
  if (uid) await remove(ref(db, `${XDB.presence}/${uid}`));
  return signOut(auth);
}

async function xResetPassword(email) {
  const { auth, sendPasswordResetEmail } = window._FB;
  return sendPasswordResetEmail(auth, email);
}

/* ── User profile ────────────────────────────────────────────────────── */
async function xGetProfile(uid) {
  const { db, ref, get } = window._FB;
  const snap = await get(ref(db, `${XDB.users}/${uid}`));
  return snap.exists() ? snap.val() : null;
}

async function xUpdateProfile(uid, data) {
  const { db, ref, update, serverTimestamp } = window._FB;
  return update(ref(db, `${XDB.users}/${uid}`), { ...data, updatedAt: serverTimestamp() });
}

/* ── Membership application ──────────────────────────────────────────── */
async function xSubmitApplication(data) {
  const { db, ref, push, serverTimestamp } = window._FB;
  const uid = window._FB.auth.currentUser?.uid;
  return push(ref(db, XDB.applications), {
    ...data,
    uid:         uid || null,
    submittedAt: serverTimestamp(),
    status:      'pending'
  });
}

/* ── Auctions ────────────────────────────────────────────────────────── */
async function xPlaceBid(auctionId, amount) {
  const { db, ref, update, push, serverTimestamp } = window._FB;
  const uid  = window._FB.auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ts   = serverTimestamp();
  await update(ref(db, `${XDB.auctions}/${auctionId}`), { currentBid: amount, leadBidder: uid, lastBidAt: ts });
  await push(ref(db, `${XDB.bids}/${uid}`), { auctionId, amount, placedAt: ts });
}

function xWatchAuction(auctionId, cb) {
  const { db, ref, onValue } = window._FB;
  const r = ref(db, `${XDB.auctions}/${auctionId}`);
  onValue(r, snap => cb(snap.val()));
  return () => window._FB.off(r);
}

/* ── Messages / Chat ─────────────────────────────────────────────────── */
async function xSendMessage(conversationId, text) {
  /* Privacy check before writing */
  if (/\+?\d[\d\s\-\.]{7,}|@[a-z0-9]+\.|whatsapp|telegram|signal/i.test(text)) {
    throw new Error('PRIVACY_VIOLATION');
  }
  const { db, ref, push, serverTimestamp } = window._FB;
  const uid = window._FB.auth.currentUser?.uid;
  return push(ref(db, `${XDB.chats}/${conversationId}/messages`), {
    text,
    senderId:  uid,
    sentAt:    serverTimestamp(),
    encrypted: true   /* placeholder — in production, encrypt before write */
  });
}

function xWatchMessages(conversationId, cb) {
  const { db, ref, onValue, query, orderByChild, limitToLast } = window._FB;
  const r = query(ref(db, `${XDB.chats}/${conversationId}/messages`), orderByChild('sentAt'), limitToLast(50));
  onValue(r, snap => {
    const msgs = [];
    snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
    cb(msgs);
  });
  return () => window._FB.off(r);
}

async function xGetConversations(uid) {
  const { db, ref, get } = window._FB;
  const snap = await get(ref(db, `${XDB.chats}`));
  if (!snap.exists()) return [];
  const convos = [];
  snap.forEach(c => {
    const val = c.val();
    if (val.participants && val.participants[uid]) convos.push({ id: c.key, ...val });
  });
  return convos;
}

/* ── Concierge requests ──────────────────────────────────────────────── */
async function xSubmitConciergeRequest(category, detail, urgency) {
  if (/\+?\d[\d\s\-\.]{7,}|@[a-z0-9]+\.|whatsapp|telegram|signal/i.test(detail)) {
    throw new Error('PRIVACY_VIOLATION');
  }
  const { db, ref, push, serverTimestamp } = window._FB;
  const uid = window._FB.auth.currentUser?.uid;
  return push(ref(db, XDB.concierge), { uid, category, detail, urgency, status: 'open', submittedAt: serverTimestamp() });
}

/* ── Notifications ───────────────────────────────────────────────────── */
async function xSaveFCMToken(uid) {
  if (!uid) return;
  try {
    /* FCM token registration handled by firebase-messaging when available */
    if (!('Notification' in window) || Notification.permission === 'denied') return;
    const { db, ref, set, serverTimestamp } = window._FB;
    /* Store a placeholder — real token set after requestPushPermission() */
    await set(ref(db, `${XDB.fcmTokens}/${uid}/web`), { placeholder: true, updatedAt: serverTimestamp() });
  } catch (_) {}
}

async function xSaveRealFCMToken(uid, token) {
  const { db, ref, set, serverTimestamp } = window._FB;
  return set(ref(db, `${XDB.fcmTokens}/${uid}/web`), { token, updatedAt: serverTimestamp() });
}

function xWatchNotifications(uid, cb) {
  const { db, ref, onValue, query, orderByChild, limitToLast } = window._FB;
  const r = query(ref(db, `${XDB.notifs}/${uid}`), orderByChild('createdAt'), limitToLast(20));
  onValue(r, snap => {
    const list = [];
    snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    cb(list.reverse());
  });
  return () => window._FB.off(r);
}

async function xMarkNotifRead(uid, notifId) {
  const { db, ref, update } = window._FB;
  return update(ref(db, `${XDB.notifs}/${uid}/${notifId}`), { read: true });
}

/* ── Online presence ─────────────────────────────────────────────────── */
function initPresence() {
  const { auth, db, ref, set, remove, onDisconnect, serverTimestamp, onAuthStateChanged } = window._FB;
  onAuthStateChanged(auth, user => {
    if (!user) return;
    const presRef = ref(db, `${XDB.presence}/${user.uid}`);
    set(presRef, { online: true, lastSeen: serverTimestamp() });
    onDisconnect(presRef).set({ online: false, lastSeen: serverTimestamp() });
  });
}

/* ── Event RSVPs ─────────────────────────────────────────────────────── */
async function xRSVPEvent(eventId) {
  const { db, ref, set, serverTimestamp } = window._FB;
  const uid = window._FB.auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return set(ref(db, `${XDB.events}/${eventId}/rsvps/${uid}`), { rsvpAt: serverTimestamp() });
}

/* ── Push notification permission ───────────────────────────────────── */
async function requestPushPermission() {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

/* ── Auth state observer (called by app.js) ──────────────────────────── */
function xOnAuthChange(cb) {
  window._FB.onAuthStateChanged(window._FB.auth, cb);
}

/* ── Exports ─────────────────────────────────────────────────────────── */
window.XFire = {
  load: loadFirebaseSDKs,
  signUp: xSignUp, signIn: xSignIn, signInGoogle: xSignInGoogle,
  signOut: xSignOut, resetPassword: xResetPassword,
  getProfile: xGetProfile, updateProfile: xUpdateProfile,
  submitApplication: xSubmitApplication,
  placeBid: xPlaceBid, watchAuction: xWatchAuction,
  sendMessage: xSendMessage, watchMessages: xWatchMessages, getConversations: xGetConversations,
  submitConciergeRequest: xSubmitConciergeRequest,
  watchNotifications: xWatchNotifications, markNotifRead: xMarkNotifRead,
  saveFCMToken: xSaveFCMToken, saveRealFCMToken: xSaveRealFCMToken,
  requestPushPermission, rsvpEvent: xRSVPEvent,
  onAuthChange: xOnAuthChange,
  XDB
};
