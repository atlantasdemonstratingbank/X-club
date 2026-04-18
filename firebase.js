/* firebase.js — X Club v3 */
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

async function loadFirebase() {
  const fb = window.firebase;
  if (!fb) throw new Error('Firebase SDK not loaded');
  firebase.initializeApp(FIREBASE_CONFIG);
  _auth = firebase.auth();
  _db   = firebase.database();

  window.XF = {
    auth: _auth,
    db:   _db,

    /* ── Auth ── */
    onAuth:      (cb)          => _auth.onAuthStateChanged(cb),
    signIn:      (e, p)        => _auth.signInWithEmailAndPassword(e, p),
    signUp:      (e, p)        => _auth.createUserWithEmailAndPassword(e, p),
    signOut:     ()            => _auth.signOut(),
    resetPw:     (e)           => _auth.sendPasswordResetEmail(e),
    googleAuth:  ()            => _auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()),
    updateProfile: (data)      => _auth.currentUser.updateProfile(data),
    currentUser: ()            => _auth.currentUser,

    /* ── DB helpers ── */
    set:    (path, val)        => _db.ref(path).set(val),
    update: (path, val)        => _db.ref(path).update(val),
    push:   (path, val)        => _db.ref(path).push(val),
    get:    (path)             => _db.ref(path).once('value'),
    remove: (path)             => _db.ref(path).remove(),
    on:     (path, cb)         => { _db.ref(path).on('value', cb); return () => _db.ref(path).off('value', cb); },
    ts:     ()                 => firebase.database.ServerValue.TIMESTAMP,
    multiUpdate: (updates)     => _db.ref().update(updates),
  };
}

window.XFire = { load: loadFirebase };
