/* firebase.js — X Club v7
 *
 * KEY FIXES vs previous version:
 *
 * 1. STABLE REFS — XF.on() now caches the same ref object per path so that
 *    the off() returned from on() actually removes the correct listener.
 *    Old code created a new ref() on each call, making off() a no-op and
 *    stacking duplicate listeners on every auth-state change.
 *
 * 2. LISTENER GUARD — XF.on() is idempotent per (path+event+callback).
 *    Calling it twice with the same args silently ignores the second call
 *    instead of attaching a duplicate.
 *
 * 3. QUERY HELPERS — XF.query() exposes orderByChild / limitToLast / endAt
 *    so callers no longer need to reach into XF.db directly.
 *
 * 4. CHILD EVENT HELPERS — XF.onChild() attaches child_added / child_changed
 *    / child_removed on a stable ref and returns a proper unsub function.
 *
 * 5. LAST-MESSAGE HELPER — XF.getLast(path, n) fetches the last N children
 *    ordered by key (insertion order). Fixes chat preview showing first
 *    message instead of latest.
 *
 * 6. GLOBAL UNSUB — XF.offAll() tears down every active listener at once.
 *    Called on sign-out so no stale listeners survive across sessions.
 *
 * 7. ERROR WRAPPING — every DB write (set/update/push/remove/multiUpdate)
 *    logs path + error on failure instead of silently swallowing it.
 *
 * 8. SERVER TIMESTAMP shorthand kept as XF.ts() — unchanged for callers.
 */

'use strict';

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyCaG3mOPftbb4OwxL3qA4TZkZpife5SXbM',
  authDomain:        'x-club-413fa.firebaseapp.com',
  databaseURL:       'https://x-club-413fa-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:         'x-club-413fa',
  storageBucket:     'x-club-413fa.firebasestorage.app',
  messagingSenderId: '1035750007609',
  appId:             '1:1035750007609:web:11ffcef313674785a77ee8'
};

let _auth, _db;

// ── Ref cache — one stable ref object per path ──────────────────────────────
const _refCache = new Map();
function _ref(path) {
  if (!_refCache.has(path)) _refCache.set(path, _db.ref(path));
  return _refCache.get(path);
}

// ── Listener registry — tracks every active listener for dedup + offAll ─────
// key: `${path}::${event}::${cb identity}`
const _listeners = new Map();

function _listenerKey(path, event, cb) {
  return `${path}::${event}::${String(cb).slice(0, 80)}`;
}

// ── Write wrapper — surfaces failures to console without swallowing ──────────
function _write(label, promise) {
  return promise.catch(err => {
    console.error(`[XF] ${label} failed:`, err);
    throw err;
  });
}

// ────────────────────────────────────────────────────────────────────────────

async function loadFirebase() {
  if (!window.firebase) throw new Error('[XF] Firebase SDK not loaded');

  firebase.initializeApp(FIREBASE_CONFIG);
  _auth = firebase.auth();
  _db   = firebase.database();

  window.XF = {
    // Raw handles (kept for feed query chains that need orderByChild etc.)
    auth: _auth,
    db:   _db,

    /* ── Auth ──────────────────────────────────────────────────────────── */
    onAuth:        (cb)      => _auth.onAuthStateChanged(cb),
    signIn:        (e, p)    => _auth.signInWithEmailAndPassword(e, p),
    signUp:        (e, p)    => _auth.createUserWithEmailAndPassword(e, p),
    signOut:       ()        => { window.XF.offAll(); return _auth.signOut(); },
    resetPw:       (e)       => _auth.sendPasswordResetEmail(e),
    googleAuth:    ()        => _auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()),
    updateProfile: (data)    => _auth.currentUser.updateProfile(data),
    currentUser:   ()        => _auth.currentUser,

    /* ── One-shot reads ─────────────────────────────────────────────────── */
    // Standard full-path read
    get: (path) => _ref(path).once('value'),

    // Fetch last N children by push-key order (newest last).
    // Use this for chat previews — avoids loading the entire conversation.
    getLast: (path, n = 1) => _db.ref(path).limitToLast(n).once('value'),

    /* ── Query builder (returns a Firebase ref/query for chaining) ──────── */
    query: (path) => _db.ref(path),

    /* ── DB writes ──────────────────────────────────────────────────────── */
    set:         (path, val) => _write(`set(${path})`,    _ref(path).set(val)),
    update:      (path, val) => _write(`update(${path})`, _ref(path).update(val)),
    push:        (path, val) => _write(`push(${path})`,   _ref(path).push(val)),
    remove:      (path)      => _write(`remove(${path})`, _ref(path).remove()),
    multiUpdate: (updates)   => _write('multiUpdate',      _db.ref().update(updates)),
    ts:          ()          => firebase.database.ServerValue.TIMESTAMP,

    /* ── Realtime value listener ────────────────────────────────────────── */
    // Returns an unsub() function that ACTUALLY works because it calls off()
    // on the same ref object that on() used (via _refCache).
    // Duplicate calls with identical (path, cb) are silently ignored.
    on(path, cb) {
      const key = _listenerKey(path, 'value', cb);
      if (_listeners.has(key)) return _listeners.get(key).unsub;

      const r = _ref(path);
      r.on('value', cb);

      const unsub = () => {
        r.off('value', cb);
        _listeners.delete(key);
      };

      _listeners.set(key, { ref: r, event: 'value', cb, unsub });
      return unsub;
    },

    /* ── Realtime child listener ────────────────────────────────────────── */
    // event: 'child_added' | 'child_changed' | 'child_removed'
    // Returns unsub(). Safe to call multiple times — deduped.
    //
    // IMPORTANT for child_added: Firebase replays ALL existing children on
    // first attach. If you only want NEW children, filter by timestamp in cb:
    //   const since = Date.now();
    //   XF.onChild(path, 'child_added', snap => {
    //     if ((snap.val().createdAt || 0) < since) return; // skip old
    //     ...
    //   });
    onChild(path, event, cb) {
      const key = _listenerKey(path, event, cb);
      if (_listeners.has(key)) return _listeners.get(key).unsub;

      const r = _ref(path);
      r.on(event, cb);

      const unsub = () => {
        r.off(event, cb);
        _listeners.delete(key);
      };

      _listeners.set(key, { ref: r, event, cb, unsub });
      return unsub;
    },

    /* ── One-shot child event (fires once, self-removes) ────────────────── */
    onceChild(path, event, cb) {
      const r = _ref(path);
      const wrapped = (snap) => { r.off(event, wrapped); cb(snap); };
      r.on(event, wrapped);
    },

    /* ── Tear down ALL active listeners ─────────────────────────────────── */
    // Called automatically inside signOut(). Call manually if needed.
    offAll() {
      _listeners.forEach(({ ref: r, event, cb }) => {
        try { r.off(event, cb); } catch (_) {}
      });
      _listeners.clear();
    },
  };
}

window.XFire = { load: loadFirebase };
