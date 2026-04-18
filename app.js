/* app.js — X Club v4 — fully fixed */
'use strict';

/* ══════════════════════════════════════════════
   GROQ AI
══════════════════════════════════════════════ */
let _groqKey = null;
async function getGroqKey() {
  if (_groqKey) return _groqKey;
  try { const s=await window.XF.get('config/groqKey'); if(s.exists()){_groqKey=s.val();return _groqKey;} } catch(e) {}
  return null;
}
async function callGroq({ system, user, maxTokens=1024 }) {
  const key=await getGroqKey(); if(!key) throw new Error('No Groq key');
  const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:'llama-3.3-70b-versatile',max_tokens:maxTokens,
      messages:[{role:'system',content:system},{role:'user',content:user}]})
  });
  if(!res.ok) throw new Error('Groq '+res.status);
  const d=await res.json(); return d.choices?.[0]?.message?.content?.trim()||'';
}

/* ══════════════════════════════════════════════
   FLUTTERWAVE
══════════════════════════════════════════════ */
const MEMBERSHIP_PRICE=1999, MEMBERSHIP_CURRENCY='EUR';
let FLW_PUBLIC_KEY='FLWPUBK-9b3e74ad491f4e5e52d93bd09e3da203-X';

function currencySymbol(c){return{NGN:'₦',USD:'$',GBP:'£',EUR:'€',GHS:'₵',KES:'KSh',ZAR:'R',TZS:'TSh',UGX:'USh',RWF:'RF'}[c]||c||'€';}
function launchFlutterwave(post,amount){
  const c=post.bizCurrency||'EUR',ref='xclub_'+post.id+'_'+currentUser?.uid+'_'+Date.now();
  if(typeof FlutterwaveCheckout==='undefined'){
    showToast('Payment system loading — please try again');return;
  }
  FlutterwaveCheckout({
    public_key:FLW_PUBLIC_KEY,
    tx_ref:ref,
    amount:amount,
    currency:c,
    payment_options:'card,banktransfer,ussd',
    customer:{email:currentUser?.email||'',name:currentProfile?.displayName||'Investor'},
    customizations:{title:post.bizTitle||'Investment',description:'Investment via X-Musk Financial Club',logo:''},
    callback:async function(data){
      if(data.status==='successful'||data.status==='completed'){
        try{
          // Record the investment and update raised + investor count atomically
          await window.XF.set('investments/'+post.id+'/'+currentUser.uid,{
            uid:currentUser.uid,name:currentProfile?.displayName,email:currentUser.email,
            amount,currency:c,status:'paid',txRef:data.tx_ref||ref,
            transactionId:data.transaction_id||'',paidAt:window.XF.ts()
          });
          // Re-read current values to avoid race
          const postSnap=await window.XF.get('posts/'+post.id);
          const current=postSnap.exists()?postSnap.val():{};
          const invSnap=await window.XF.get('investments/'+post.id);
          let totalRaised=0,investorCount=0;
          if(invSnap.exists())invSnap.forEach(c=>{const v=c.val();if(v.status==='paid'){totalRaised+=(v.amount||0);investorCount++;}});
          await window.XF.update('posts/'+post.id,{bizRaised:totalRaised,investorCount});
          showToast('✅ Payment confirmed! Thank you for investing.');
          renderFeed();
        }catch(err){showToast('Payment confirmed but update failed — contact support');}
      }else showToast('Payment was not completed');
    },
    onclose:function(){}
  });
}

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let currentUser=null,currentProfile=null,activePage='feed',feedTab='for-you';
let activeConvUid=null,msgUnsubscribe=null,_postDateMode='now',selectedInvestAmount=0;
const ADMIN_EMAIL='admin@gmail.com';
let isAdmin=false,allUsersCache=[];

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function $(id){return document.getElementById(id);}
function timeAgo(ts){
  if(!ts)return'';const s=Math.floor((Date.now()-ts)/1000);
  if(s<60)return s+'s';if(s<3600)return Math.floor(s/60)+'m';
  if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d';
}
function avatarHTML(p,size='md'){
  if(p?.photoURL)return`<img class="avatar avatar-${size}" src="${p.photoURL}" alt="">`;
  return`<div class="avatar avatar-${size}">${p?.displayName?p.displayName.charAt(0).toUpperCase():'?'}</div>`;
}
function verifiedBadge(v,lg=false){
  if(!v)return'';
  return`<span class="verified-badge${lg?' lg':''}" title="Verified"><svg viewBox="0 0 12 12" fill="none" style="width:60%;height:60%"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
function showToast(msg){
  const c=$('toastContainer');if(!c)return;
  const t=document.createElement('div');t.className='toast';t.textContent=msg;c.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},3000);
}
function escapeHTML(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function formatCount(n){n=Number(n)||0;if(n>=1e9)return(n/1e9).toFixed(1).replace(/\.0$/,'')+'B';if(n>=1e6)return(n/1e6).toFixed(1).replace(/\.0$/,'')+'M';if(n>=1e3)return(n/1e3).toFixed(1).replace(/\.0$/,'')+'K';return String(n);}
function requireVerified(action){
  if(!currentUser){showPage('login');return false;}
  // These actions are open to all logged-in users (verified or not)
  const openActions=['messages','dm','connect with members','follow','post','comment','event'];
  if(openActions.includes(action))return true;
  // Everything else (invest, private events, etc.) requires verification
  if(!currentProfile?.verified){showPaywall(action);return false;}
  return true;
}

/* ══════════════════════════════════════════════
   PWA INSTALL
══════════════════════════════════════════════ */
let _deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();_deferredInstall=e;
  const b=$('pwaInstallBtn');if(b)b.style.display='flex';
});
window.addEventListener('appinstalled',()=>{
  _deferredInstall=null;
  const b=$('pwaInstallBtn');if(b)b.style.display='none';
  showToast('X-Musk Financial Club installed!');
});
function triggerPwaInstall(){
  if(!_deferredInstall){showToast('Open in your browser to install');return;}
  _deferredInstall.prompt();
  _deferredInstall.userChoice.then(r=>{if(r.outcome==='accepted')showToast('Installing…');_deferredInstall=null;});
}

/* ══════════════════════════════════════════════
   LANDING PAGE PARTICLES
══════════════════════════════════════════════ */
function initLandingParticles() {
  const container = document.getElementById('landingParticles');
  if (!container) return;
  container.innerHTML = '';
  const count = window.innerWidth < 480 ? 18 : 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'landing-particle';
    p.style.cssText = `
      left:${Math.random()*100}%;
      top:${20 + Math.random()*75}%;
      --dur:${4 + Math.random()*8}s;
      --delay:${Math.random()*8}s;
      width:${1 + Math.random()*2}px;
      height:${1 + Math.random()*2}px;
      opacity:0;
    `;
    container.appendChild(p);
  }
}

/* ══════════════════════════════════════════════
   LOADER
══════════════════════════════════════════════ */
function hideLoader(){
  const l=$('appLoader');if(l){l.classList.add('gone');setTimeout(()=>l.remove(),600);}
  const a=$('app');if(a)a.classList.add('visible');
}

/* ══════════════════════════════════════════════
   PAGE ROUTING  (proper SPA back stack)
══════════════════════════════════════════════ */
const _pageStack=[];
let _suppressPopstate=false; // guard against our own pushState triggering popstate

function showPage(name,opts={}){
  if(name==='feed'&&!currentUser)name='landing';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=$('page-'+name);if(pg)pg.classList.add('active');
  activePage=name;updateNavActive();window.scrollTo(0,0);
  if(name==='feed')renderFeed();
  else if(_feedUnsubscribe){try{_feedUnsubscribe();}catch(e){}}_feedUnsubscribe=null;
  if(name==='discover')renderDiscover();
  if(name==='notifications')renderNotifications();
  if(name==='messages')renderConversations();
  if(name==='profile')renderOwnProfile();
  if(name==='user-profile')renderUserProfile(opts.uid);
  if(name==='post-detail')renderPostDetail(opts.postId);
  // Only push if it's a navigable page and not the same as the current top
  if(!['landing','login','register','reset'].includes(name)){
    const top=_pageStack[_pageStack.length-1];
    const isDuplicate=top&&top.name===name&&JSON.stringify(top.opts)===JSON.stringify(opts);
    if(!isDuplicate){
      _pageStack.push({name,opts});
      // Push a real browser history entry so device back/swipe is intercepted
      _suppressPopstate=true;
      window.history.pushState({page:name,opts},'',window.location.pathname);
      _suppressPopstate=false;
    }
  }
}

function goBack(){
  _pageStack.pop();
  const prev=_pageStack[_pageStack.length-1];
  if(prev){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const pg=$('page-'+prev.name);if(pg)pg.classList.add('active');
    activePage=prev.name;updateNavActive();window.scrollTo(0,0);
    if(prev.name==='user-profile')renderUserProfile(prev.opts?.uid);
    else if(prev.name==='feed')renderFeed();
    else if(prev.name==='discover')renderDiscover();
    else if(prev.name==='profile')renderOwnProfile();
    else if(prev.name==='post-detail')renderPostDetail(prev.opts?.postId);
    else if(prev.name==='notifications')renderNotifications();
    else if(prev.name==='messages')renderConversations();
  }else showPage('feed');
}

// Intercept device back button / swipe-back gesture
window.addEventListener('popstate',()=>{
  if(_suppressPopstate)return;
  // If DM is open, close it first
  if($('dmFullpage')&&$('dmFullpage').style.display!=='none'){
    closeDMFullpage();
    // Re-push so next back press goes further
    window.history.pushState({},'',window.location.pathname);
    return;
  }
  goBack();
  // Re-push an entry so there's always something to go back to
  // (prevents the very first back from leaving the PWA)
  window.history.pushState({},'',window.location.pathname);
});
function updateNavActive(){
  document.querySelectorAll('.nav-link,.mobile-nav-link').forEach(l=>l.classList.toggle('active',l.dataset.page===activePage));
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */
async function handleLogin(e){
  e.preventDefault();
  const email=$('loginEmail').value.trim(),pass=$('loginPass').value,btn=$('loginBtn');
  if(!email||!pass)return showToast('Please fill in all fields');
  btn.disabled=true;btn.textContent='Signing in…';
  try{await window.XF.signIn(email,pass);}
  catch(err){showToast(friendlyError(err.code));btn.disabled=false;btn.textContent='Sign in';}
}
async function handleRegister(e){
  e.preventDefault();
  const name=$('regName').value.trim(),email=$('regEmail').value.trim(),pass=$('regPass').value;
  const handle=$('regHandle').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const btn=$('regBtn');
  if(!name||!email||!pass||!handle)return showToast('Please fill in all fields');
  if(pass.length<8)return showToast('Password must be at least 8 characters');
  if(handle.length<3)return showToast('Handle must be at least 3 characters');
  btn.disabled=true;btn.textContent='Creating account…';
  try{
    const hSnap=await window.XF.get('handles/'+handle);
    if(hSnap.exists()){showToast('@'+handle+' is already taken');btn.disabled=false;btn.textContent='Create account';return;}
    const cred=await window.XF.signUp(email,pass);
    await window.XF.updateProfile({displayName:name});
    await window.XF.set('users/'+cred.user.uid,{uid:cred.user.uid,displayName:name,handle,email,bio:'',photoURL:'',verified:false,followersCount:0,followingCount:0,postsCount:0,joinedAt:window.XF.ts()});
    await window.XF.set('handles/'+handle,cred.user.uid);
    showToast('Welcome to X-Musk Financial Club!');
  }catch(err){showToast(friendlyError(err.code));btn.disabled=false;btn.textContent='Create account';}
}
async function handleGoogleAuth(){
  try{
    const cred=await window.XF.googleAuth();
    const snap=await window.XF.get('users/'+cred.user.uid);
    if(!snap.exists()){
      let handle=(cred.user.email||'').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
      const hSnap=await window.XF.get('handles/'+handle);
      if(hSnap.exists())handle=handle+Math.floor(Math.random()*9000+1000);
      await window.XF.set('users/'+cred.user.uid,{uid:cred.user.uid,displayName:cred.user.displayName||'Member',handle,email:cred.user.email||'',bio:'',photoURL:cred.user.photoURL||'',verified:false,followersCount:0,followingCount:0,postsCount:0,joinedAt:window.XF.ts()});
      await window.XF.set('handles/'+handle,cred.user.uid);
    }
  }catch(err){showToast(friendlyError(err.code));}
}
async function handleLogout(){await window.XF.signOut();currentProfile=null;currentUser=null;_pageStack.length=0;showPage('landing');}
function friendlyError(code){
  return({'auth/user-not-found':'No account found with that email','auth/wrong-password':'Incorrect password','auth/invalid-credential':'Incorrect email or password','auth/email-already-in-use':'Email already registered','auth/weak-password':'Password is too weak','auth/invalid-email':'Invalid email address','auth/popup-closed-by-user':'Sign-in was cancelled','auth/network-request-failed':'Network error — check your connection'}[code])||'Something went wrong. Please try again.';
}
async function onAuthChange(user){
  currentUser=user;
  if(user){
    if(user.email===ADMIN_EMAIL){
      isAdmin=true;
      const snap=await window.XF.get('users/'+user.uid);
      currentProfile=snap.exists()?snap.val():{displayName:'Admin',uid:user.uid};
      hideLoader();showPage('admin');loadAdminUsers();setTimeout(injectAdminTools,400);return;
    }
    isAdmin=false;
    const snap=await window.XF.get('users/'+user.uid);
    currentProfile=snap.exists()?snap.val():null;
    updateNavUser();updateComposerAvatar();loadSuggested();startNotifWatch();startMsgWatch();
    updateSidebarVerifyBtn();
    // Check for profile share deep-link first
    const handled=checkProfileDeepLink();
    if(!handled){
      if(['landing','login','register'].includes(activePage))showPage('feed');
      else showPage(activePage);
    }
    setTimeout(loadBizFeed,1500);setTimeout(runScheduledPosts,5000);
    checkDeepLink();
  }else{
    isAdmin=false;currentProfile=null;updateNavUser();
    updateSidebarVerifyBtn();
    // Even logged-out users can see shared profiles
    if(!checkProfileDeepLink())showPage('landing');
  }
  hideLoader();
}
function updateNavUser(){
  const wrap=$('navUserWrap');if(!wrap)return;
  if(currentUser&&currentProfile){
    wrap.style.display='flex';
    const n=$('navUserName'),h=$('navUserHandle'),a=$('navUserAvatar');
    if(n)n.innerHTML=escapeHTML(currentProfile.displayName||'Member')+verifiedBadge(currentProfile.verified);
    if(h)h.textContent='@'+(currentProfile.handle||'member');
    if(a)a.outerHTML=avatarHTML(currentProfile,'md').replace('class="avatar','id="navUserAvatar" class="avatar');
  }else wrap.style.display='none';
}
function updateComposerAvatar(){
  const el=$('composerAvatar');
  if(el&&currentProfile)el.outerHTML=avatarHTML(currentProfile,'md').replace('class="avatar','id="composerAvatar" class="avatar');
}

/* ══════════════════════════════════════════════
   PAYWALL
══════════════════════════════════════════════ */
function showPaywall(){$('paywallModal').classList.add('open');}
function closePaywall(){$('paywallModal').classList.remove('open');}
function initiatePayment(){
  if(!currentUser||!currentProfile){showToast('Please sign in first');return;}
  if(typeof FlutterwaveCheckout==='undefined'){showToast('Payment system loading — try again');return;}
  FlutterwaveCheckout({
    public_key:FLW_PUBLIC_KEY,tx_ref:'XCLUB-'+currentUser.uid+'-'+Date.now(),
    amount:MEMBERSHIP_PRICE,currency:MEMBERSHIP_CURRENCY,payment_options:'card,banktransfer,ussd',
    customer:{email:currentUser.email,name:currentProfile.displayName||'Member'},
    customizations:{title:'X Club Membership',description:'Annual verified membership',logo:''},
    callback:async function(data){
      if(data.status==='successful'||data.status==='completed'){
        try{
          await window.XF.update('users/'+currentUser.uid,{verified:true,verifiedAt:window.XF.ts(),paymentRef:data.transaction_id||data.tx_ref});
          currentProfile.verified=true;closePaywall();showToast('✦ You are now a verified member!');
          updateNavUser();renderOwnProfile();
        }catch(err){showToast('Payment confirmed but update failed — contact support');}
      }else showToast('Payment was not completed');
    },
    onclose:function(){}
  });
}

/* ══════════════════════════════════════════════
   FEED  (real-time listener)
══════════════════════════════════════════════ */
let _feedUnsubscribe=null;
function renderFeed(){
  const container=$('feedPosts');if(!container)return;
  // Tear down any previous listener
  if(_feedUnsubscribe){try{_feedUnsubscribe();}catch(e){}}_feedUnsubscribe=null;
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  _feedUnsubscribe=window.XF.on('posts',async snap=>{
    try{
      let posts=[];
      if(snap.exists())snap.forEach(c=>posts.push({id:c.key,...c.val()}));
      posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      // Filter out posts from blocked users
      const blockedUids=await getBlockedUids();
      if(blockedUids.size>0)posts=posts.filter(p=>!blockedUids.has(p.authorUid));
      if(feedTab==='following'&&currentUser){
        const connSnap=await window.XF.get('connections/'+currentUser.uid);
        const connUids=connSnap.exists()?Object.keys(connSnap.val()):[];
        posts=posts.filter(p=>connUids.includes(p.authorUid)||p.authorUid===CLAUDE_ENGINEER_UID);
        if(posts.length===0){container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">◪</div><div class="empty-state-title">Nothing from connections</div><div class="empty-state-desc">Connect with members to see their posts here</div></div>`;return;}
      }
      if(posts.length===0){container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">◪</div><div class="empty-state-title">Nothing here yet</div><div class="empty-state-desc">Be the first to post something</div></div>`;return;}
      await _renderPostList(posts,container);
    }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load posts</div></div>';}
  });
}
async function _renderPostList(posts,container){
  const uids=[...new Set(posts.map(p=>p.authorUid).filter(u=>u&&u!==CLAUDE_ENGINEER_UID))];
  const profiles={};
  // Fetch each profile independently — one failure must not block the whole feed
  await Promise.allSettled(uids.map(async uid=>{
    try{const s=await window.XF.get('users/'+uid);if(s.exists())profiles[uid]=s.val();}catch(e){}
  }));
  container.innerHTML=posts.map(p=>{
    if(p.type==='business')return businessPostHTML(p,profiles[p.authorUid]);
    if(p.authorUid===CLAUDE_ENGINEER_UID)return claudeEngineerPostHTML(p);
    return postHTML(p,profiles[p.authorUid]);
  }).join('');
}
function switchFeedTab(tab,el){
  feedTab=tab;
  document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');renderFeed();
}

/* ── Post HTML ── */
const CLAUDE_ENGINEER_UID='claude_engineer_bot';
function postHTML(post,author){
  const isLiked=currentUser&&post.likes&&post.likes[currentUser.uid];
  const likeCount=post.likes?Object.keys(post.likes).length:0;
  const commentCount=post.commentCount||0;
  const isOwner=currentUser&&post.authorUid===currentUser.uid;
  let mediaHTML='';
  if(post.imageURL)mediaHTML=`<img class="post-image" src="${post.imageURL}" alt="Post image" loading="lazy">`;
  if(post.type==='event'){
    mediaHTML+=`<div class="post-event-card">
      <span class="post-event-badge ${post.eventPrivate?'badge-private':'badge-public'}">${post.eventPrivate?'⊘ Private Event':'◯ Open Event'}</span>
      <div class="post-event-title">${escapeHTML(post.eventTitle||'')}</div>
      <div class="post-event-meta">
        ${post.eventDate?`<span>▦ ${post.eventDate}</span>`:''}
        ${post.eventTime?`<span>◷ ${post.eventTime}</span>`:''}
        ${post.eventLocation?`<span>◉ ${escapeHTML(post.eventLocation)}</span>`:''}
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px;font-size:0.8rem" onclick="event.stopPropagation();rsvpEvent('${post.id}')">RSVP</button>
    </div>`;
  }
  return`<div class="post" data-id="${post.id}" onclick="openPost('${post.id}',event)">
    <div onclick="openUserProfile('${post.authorUid}',event)">${avatarHTML(author,'md')}</div>
    <div class="post-body">
      <div class="post-header">
        <span class="post-name">${escapeHTML(author?.displayName||'Unknown')}</span>
        ${verifiedBadge(author?.verified)}
        <span class="post-handle">@${escapeHTML(author?.handle||'unknown')}</span>
        <span class="post-time">· ${timeAgo(post.createdAt)}</span>
        ${isOwner?`<span onclick="event.stopPropagation();deletePost('${post.id}')" style="margin-left:auto;color:var(--text-dim);cursor:pointer;font-size:0.8rem;padding:2px 8px;border-radius:4px" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-dim)'">✕</span>`:''}
      </div>
      <div class="post-text">${escapeHTML(post.text||'')}</div>
      ${mediaHTML}
      <div class="post-actions" onclick="event.stopPropagation()">
        <div class="post-action comment" onclick="openPost('${post.id}',event)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${commentCount>0?' '+formatCount(commentCount):''}</div>
        <div class="post-action like${isLiked?' liked':''}" onclick="toggleLike('${post.id}',this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likeCount>0?' '+formatCount(likeCount):''}</div>
        <div class="post-action share" onclick="sharePost('${post.id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      </div>
    </div>
  </div>`;
}
function claudeEngineerAvatarHTML(size='md'){
  const px={sm:32,md:40,lg:48,xl:80}[size]||40;
  return`<div class="avatar avatar-${size}" style="background:#111;border:1.5px solid #333;flex-shrink:0;display:flex;align-items:center;justify-content:center;width:${px}px;height:${px}px;border-radius:50%"><svg width="${Math.round(px*0.5)}" height="${Math.round(px*0.5)}" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#e7e9ea" opacity="0.9"/></svg></div>`;
}
function claudeEngineerPostHTML(post){
  const isLiked=currentUser&&post.likes&&post.likes[currentUser.uid];
  const likeCount=post.likes?Object.keys(post.likes).length:0;
  const commentCount=post.commentCount||0;
  return`<div class="post" data-id="${post.id}" onclick="openPost('${post.id}',event)">
    ${claudeEngineerAvatarHTML('md')}
    <div class="post-body">
      <div class="post-header">
        <span class="post-name">Claude Engineer</span>${verifiedBadge(true)}
        <span class="post-handle">@claudeengineer</span>
        <span class="post-time">· ${timeAgo(post.createdAt)}</span>
      </div>
      <div class="post-text">${escapeHTML(post.text||'')}</div>
      <div class="post-actions" onclick="event.stopPropagation()">
        <div class="post-action comment" onclick="openPost('${post.id}',event)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${commentCount>0?' '+formatCount(commentCount):''}</div>
        <div class="post-action like${isLiked?' liked':''}" onclick="toggleLike('${post.id}',this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likeCount>0?' '+formatCount(likeCount):''}</div>
        <div class="post-action share" onclick="sharePost('${post.id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      </div>
    </div>
  </div>`;
}

/* ── Submit Post (single clean function, no patch chains) ── */
async function submitPost(){
  if(!requireVerified('post'))return;
  const isBiz=$('postTypeBusiness')?.classList.contains('active');
  const isEvent=$('postTypeEvent')?.classList.contains('active');
  if(isBiz){await _submitBusinessPost();return;}
  if(_postDateMode==='schedule'){
    const ts=resolvePostTimestamp();
    if(ts<=Date.now()){showToast('Pick a future date/time for scheduling');return;}
    await _saveScheduledPost(ts);return;
  }
  const textarea=$('postText'),text=textarea.value.trim(),imageInput=$('postImageInput');
  if(!text&&!imageInput?.files[0])return showToast('Write something first');
  const btn=$('postSubmitBtn');btn.disabled=true;btn.textContent='Posting…';
  try{
    let imageURL='';
    if(imageInput?.files[0]){showToast('Uploading image…');imageURL=(await window.XCloud.upload(imageInput.files[0],'x_posts')).url;}
    const ts=_postDateMode==='backdate'?resolvePostTimestamp():Date.now();
    const postData={authorUid:currentUser.uid,text,imageURL,type:isEvent?'event':'post',createdAt:ts,commentCount:0};
    if(isEvent){
      postData.eventTitle=$('eventTitle').value.trim();postData.eventDate=$('eventDate').value;
      postData.eventTime=$('eventTime').value;postData.eventLocation=$('eventLocation').value.trim();
      postData.eventPrivate=$('eventPrivate').checked;postData.rsvps={};
    }
    await window.XF.push('posts',postData);
    await window.XF.update('users/'+currentUser.uid,{postsCount:(currentProfile.postsCount||0)+1});
    currentProfile.postsCount=(currentProfile.postsCount||0)+1;
    textarea.value='';if(imageInput)imageInput.value='';
    $('postImagePreview').innerHTML='';
    if(isEvent)togglePostType('post');
    setPostDateMode('now');showToast('Posted!');renderFeed();
  }catch(err){showToast('Failed to post — '+err.message);}
  finally{btn.disabled=false;btn.textContent='Post';}
}
async function _submitBusinessPost(){
  const text=$('postText').value.trim(),bizTitle=$('bizTitle').value.trim();
  const bizTarget=parseFloat($('bizTarget').value),bizSector=$('bizSector').value.trim();
  if(!text)return showToast('Describe your business opportunity');
  if(!bizTitle)return showToast('Enter a business title');
  if(!bizTarget||bizTarget<=0)return showToast('Enter a valid funding target');
  const btn=$('postSubmitBtn');btn.disabled=true;btn.textContent='Posting…';
  try{
    await window.XF.push('posts',{authorUid:currentUser.uid,text,type:'business',bizTitle,bizTarget,bizSector,
      bizCurrency:$('bizCurrency')?.value||'EUR',bizEmail:$('bizEmail')?.value.trim()||'',
      bizRaised:0,investorCount:0,createdAt:Date.now(),commentCount:0});
    await window.XF.update('users/'+currentUser.uid,{postsCount:(currentProfile.postsCount||0)+1});
    currentProfile.postsCount=(currentProfile.postsCount||0)+1;
    $('postText').value='';$('bizTitle').value='';$('bizTarget').value='';$('bizSector').value='';
    if($('bizEmail'))$('bizEmail').value='';
    togglePostType('post');showToast('Business post published!');renderFeed();
  }catch(err){showToast('Failed to post');}
  finally{btn.disabled=false;btn.textContent='Post';}
}
async function deletePost(postId){
  if(!confirm('Delete this post?'))return;
  try{
    await window.XF.remove('posts/'+postId);await window.XF.remove('comments/'+postId);
    if(currentProfile){await window.XF.update('users/'+currentUser.uid,{postsCount:Math.max(0,(currentProfile.postsCount||1)-1)});currentProfile.postsCount=Math.max(0,(currentProfile.postsCount||1)-1);}
    showToast('Post deleted');renderFeed();
  }catch(err){showToast('Could not delete post');}
}
function previewPostImage(input){
  const preview=$('postImagePreview');
  if(input.files&&input.files[0]){
    const reader=new FileReader();
    reader.onload=e=>{preview.innerHTML=`<div class="img-preview-wrap"><img src="${e.target.result}"><div class="img-preview-remove" onclick="removePostImage()">✕</div></div>`;};
    reader.readAsDataURL(input.files[0]);
  }
}
function removePostImage(){$('postImageInput').value='';$('postImagePreview').innerHTML='';}
function togglePostType(type){
  const ef=$('eventFields'),bf=$('businessFields');
  const bp=$('postTypePost'),be=$('postTypeEvent'),bb=$('postTypeBusiness');
  [bp,be,bb].forEach(b=>b?.classList.remove('active'));
  if(ef)ef.style.display='none';if(bf)bf.style.display='none';
  if(type==='event'){if(ef)ef.style.display='block';be?.classList.add('active');}
  else if(type==='business'){if(bf)bf.style.display='block';bb?.classList.add('active');}
  else bp?.classList.add('active');
}
async function toggleLike(postId,el){
  if(!currentUser){showPage('login');return;}
  const uid=currentUser.uid,snap=await window.XF.get('posts/'+postId+'/likes/'+uid);
  const heartSVG=(filled)=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  // Parse formatted count back to number (handles 1K, 1.2M etc)
  function parseFormatted(txt){
    const s=(txt||'').trim().replace(/[^0-9.KMBkmb]/g,'');
    if(!s)return 0;
    if(/k/i.test(s))return Math.round(parseFloat(s)*1000);
    if(/m/i.test(s))return Math.round(parseFloat(s)*1e6);
    if(/b/i.test(s))return Math.round(parseFloat(s)*1e9);
    return parseInt(s)||0;
  }
  if(snap.exists()){
    await window.XF.remove('posts/'+postId+'/likes/'+uid);
    el.classList.remove('liked');
    const c=parseFormatted(el.textContent)||1;
    const newC=Math.max(0,c-1);
    el.innerHTML=heartSVG(false)+(newC>0?' '+formatCount(newC):'');
  }else{
    await window.XF.set('posts/'+postId+'/likes/'+uid,true);
    el.classList.add('liked');
    const c=parseFormatted(el.textContent)||0;
    const newC=c+1;
    el.innerHTML=heartSVG(true)+' '+formatCount(newC);
  }
}
async function rsvpEvent(postId){
  if(!currentUser){showPage('login');return;}
  const uid=currentUser.uid,snap=await window.XF.get('posts/'+postId+'/rsvps/'+uid);
  if(snap.exists()){await window.XF.remove('posts/'+postId+'/rsvps/'+uid);showToast('RSVP removed');}
  else{await window.XF.set('posts/'+postId+'/rsvps/'+uid,{name:currentProfile?.displayName||'Member',at:window.XF.ts()});showToast('RSVP confirmed!');}
}
function sharePost(postId){
  const url=window.location.origin+window.location.pathname+'?post='+postId;
  if(navigator.clipboard)navigator.clipboard.writeText(url);showToast('Link copied!');
}
/* ── Open post as a FULL PAGE (not a modal) ── */
async function openPost(postId,e){
  if(e)e.stopPropagation();
  if(!currentUser){showPage('login');return;}
  showPage('post-detail',{postId});
}

async function renderPostDetail(postId){
  const container=$('postDetailContent');if(!container||!postId)return;
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const snap=await window.XF.get('posts/'+postId);if(!snap.exists()){container.innerHTML='<div class="empty-state"><div class="empty-state-title">Post not found</div></div>';return;}
    const post={id:postId,...snap.val()};
    let author=null;
    if(post.authorUid===CLAUDE_ENGINEER_UID){
      author={displayName:'Claude Engineer',handle:'claudeengineer',verified:true,photoURL:''};
    }else{
      const as=await window.XF.get('users/'+post.authorUid);
      author=as.exists()?as.val():null;
    }
    // Render the post card (non-clickable in detail view — wrap in a static div)
    const postCard=post.authorUid===CLAUDE_ENGINEER_UID?claudeEngineerPostHTML(post):postHTML(post,author);
    // Strip the outer onclick from the post card so tapping it doesn't re-navigate
    const staticPost=postCard.replace(/onclick="openPost\('[^']*',event\)"/g,'');

    container.innerHTML=`
      <div style="border-bottom:1px solid var(--border)">${staticPost}</div>
      <div id="commentsArea"></div>
      <div class="post-reply-bar">
        ${avatarHTML(currentProfile,'sm')}
        <input id="commentInput" class="comment-input" placeholder="Post your reply" onkeydown="if(event.key==='Enter')submitComment('${postId}')">
        <button class="btn btn-accent btn-sm" onclick="submitComment('${postId}')">Reply</button>
      </div>`;
    loadComments(postId);
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load post</div></div>';}
}

async function loadComments(postId){
  const area=$('commentsArea');if(!area)return;
  area.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const snap=await window.XF.get('comments/'+postId);
  const comments=[];if(snap.exists())snap.forEach(c=>comments.push({id:c.key,...c.val()}));
  comments.sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  if(comments.length===0){area.innerHTML='<div style="padding:20px 16px;color:var(--text-dim);font-size:0.9rem;text-align:center">No replies yet — be the first!</div>';return;}
  const uids=[...new Set(comments.map(c=>c.authorUid))];const profiles={};
  await Promise.all(uids.map(async uid=>{const s=await window.XF.get('users/'+uid);if(s.exists())profiles[uid]=s.val();}));
  area.innerHTML='<div class="comments-section">'+comments.map(c=>{
    const a=profiles[c.authorUid];const isOwner=currentUser&&c.authorUid===currentUser.uid;
    return`<div class="comment">
      ${avatarHTML(a,'sm')}
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-name">${escapeHTML(a?.displayName||'Unknown')}</span>${verifiedBadge(a?.verified)}
          <span class="comment-time">${timeAgo(c.createdAt)}</span>
          ${isOwner?`<span onclick="deleteComment('${postId}','${c.id}')" style="margin-left:auto;cursor:pointer;color:var(--text-dim);font-size:0.78rem;padding:2px 6px" title="Delete">✕</span>`:''}
        </div>
        <div class="comment-text">${escapeHTML(c.text||'')}</div>
      </div>
    </div>`;
  }).join('')+'</div>';
}
async function submitComment(postId){
  if(!requireVerified('comment'))return;
  const input=$('commentInput');const text=input.value.trim();if(!text)return;
  input.value='';
  await window.XF.push('comments/'+postId,{authorUid:currentUser.uid,text,createdAt:window.XF.ts()});
  const snap=await window.XF.get('posts/'+postId+'/commentCount');
  await window.XF.set('posts/'+postId+'/commentCount',(snap.val()||0)+1);
  loadComments(postId);
}
async function deleteComment(postId,commentId){
  try{
    await window.XF.remove('comments/'+postId+'/'+commentId);
    const snap=await window.XF.get('posts/'+postId+'/commentCount');
    await window.XF.set('posts/'+postId+'/commentCount',Math.max(0,(snap.val()||1)-1));
    loadComments(postId);
  }catch(e){showToast('Could not delete comment');}
}
function openPostModal(){if(!requireVerified('post'))return;$('newPostModal').classList.add('open');}
async function submitModalPost(){
  const textarea=$('modalPostText');const text=textarea.value.trim();
  if(!text)return showToast('Write something first');if(!requireVerified('post'))return;
  const btn=document.querySelector('#newPostModal .composer-submit');
  btn.disabled=true;btn.textContent='Posting…';
  try{
    await window.XF.push('posts',{authorUid:currentUser.uid,text,type:'post',createdAt:Date.now(),commentCount:0});
    textarea.value='';closeModal('newPostModal');showToast('Posted!');if(activePage==='feed')renderFeed();
  }catch(e){showToast('Failed to post');}
  finally{btn.disabled=false;btn.textContent='Post';}
}
function setPostDateMode(mode){
  _postDateMode=mode;
  ['now','backdate','schedule'].forEach(m=>{const b=$('opt'+m.charAt(0).toUpperCase()+m.slice(1));b?.classList.toggle('active',m===mode);});
  const row=$('postDateRow'),hint=$('postDateHint'),input=$('postCustomDate');if(!row)return;
  row.style.display=mode==='now'?'none':'block';
  if(input){
    if(mode==='backdate'){input.max=new Date().toISOString().slice(0,16);input.removeAttribute('min');if(hint)hint.textContent='Post will appear with this historical date';}
    else{input.min=new Date().toISOString().slice(0,16);input.removeAttribute('max');if(hint)hint.textContent='Post will go live automatically at this time';}
  }
}
function resolvePostTimestamp(){const input=$('postCustomDate');if(!input||!input.value)return Date.now();const ts=new Date(input.value).getTime();return isNaN(ts)?Date.now():ts;}

/* ── Scheduled Posts ── */
async function _saveScheduledPost(fireAt){
  if(!currentUser)return;const text=$('postText')?.value.trim();if(!text){showToast('Write something first');return;}
  await window.XF.push('scheduledPosts',{text,uid:currentUser.uid,displayName:currentProfile.displayName,handle:currentProfile.handle||'',photoURL:currentProfile.photoURL||null,verified:currentProfile.verified||false,fireAt,createdAt:Date.now(),status:'scheduled'});
  if($('postText'))$('postText').value='';setPostDateMode('now');
  showToast('◷ Post scheduled for '+new Date(fireAt).toLocaleString());
}
async function runScheduledPosts(){
  if(!currentUser)return;
  try{
    const snap=await window.XF.get('scheduledPosts');if(!snap.exists())return;
    const now=Date.now();
    for(const[key,post]of Object.entries(snap.val())){
      if(post.status==='scheduled'&&post.fireAt<=now&&post.uid===currentUser.uid){
        await window.XF.push('posts',{authorUid:post.uid,text:post.text,type:'post',createdAt:post.fireAt,commentCount:0});
        await window.XF.set('scheduledPosts/'+key+'/status','published');
        showToast('◷ Scheduled post published!');
      }
    }
  }catch(e){}
}
setInterval(runScheduledPosts,60_000);

/* ══════════════════════════════════════════════
   DISCOVER
══════════════════════════════════════════════ */
async function renderDiscover(){
  const container=$('discoverPeople');if(!container)return;
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const snap=await window.XF.get('users');const people=[];
    const blockedUids=await getBlockedUids();
    if(snap.exists())snap.forEach(c=>{if(c.key!==currentUser?.uid&&!blockedUids.has(c.key))people.push(c.val());});
    if(people.length===0){container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">⊛</div><div class="empty-state-title">No members yet</div></div>`;return;}
    const myConnSnap=currentUser?await window.XF.get('connections/'+currentUser.uid):null;
    const myConns=myConnSnap?.exists()?myConnSnap.val():{};
    const reqSnap=currentUser?await window.XF.get('connectionRequests'):null;
    container.innerHTML=people.map(p=>{
      const status=myConns[p.uid]?'connected':(reqSnap?.exists()&&reqSnap.val()[`${currentUser?.uid}_${p.uid}`]?.status==='pending')?'pending':'none';
      return`<div class="people-card" onclick="openUserProfile('${p.uid}',event)">
        ${avatarHTML(p,'md')}
        <div class="people-card-info">
          <div class="people-card-name">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div>
          <div class="people-card-handle">@${escapeHTML(p.handle||'member')}</div>
          <div class="people-card-bio">${escapeHTML(p.bio||'')}</div>
        </div>
        <div onclick="event.stopPropagation()">${connectBtnHTML(p.uid,status)}</div>
      </div>`;
    }).join('');
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load members</div></div>';}
}
function connectBtnHTML(uid,status){
  if(!currentUser||uid===currentUser.uid)return'';
  if(status==='connected')return`<button class="btn btn-following btn-sm" onclick="event.stopPropagation();disconnect('${uid}')">Connected</button>`;
  if(status==='pending')return`<button class="btn btn-outline btn-sm" disabled>Pending</button>`;
  return`<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendConnectionRequest('${uid}')">Connect</button>`;
}
async function sendConnectionRequest(toUid){
  if(!requireVerified('connect with members'))return;
  const reqId=currentUser.uid+'_'+toUid;
  await window.XF.set('connectionRequests/'+reqId,{from:currentUser.uid,to:toUid,status:'pending',createdAt:window.XF.ts()});
  await window.XF.push('notifications/'+toUid,{type:'connection_request',fromUid:currentUser.uid,fromName:currentProfile.displayName,reqId,createdAt:window.XF.ts(),read:false});
  showToast('Connection request sent!');renderDiscover();
}
async function acceptConnection(reqId,fromUid){
  const myUid=currentUser.uid;
  await window.XF.update('connectionRequests/'+reqId,{status:'accepted'});
  await window.XF.set('connections/'+myUid+'/'+fromUid,true);
  await window.XF.set('connections/'+fromUid+'/'+myUid,true);
  const myF=(await window.XF.get('users/'+myUid+'/followersCount')).val()||0;
  const thF=(await window.XF.get('users/'+fromUid+'/followersCount')).val()||0;
  const myFw=(await window.XF.get('users/'+myUid+'/followingCount')).val()||0;
  const thFw=(await window.XF.get('users/'+fromUid+'/followingCount')).val()||0;
  await window.XF.update('users/'+myUid,{followersCount:myF+1,followingCount:myFw+1});
  await window.XF.update('users/'+fromUid,{followersCount:thF+1,followingCount:thFw+1});
  if(currentProfile){currentProfile.followersCount=myF+1;currentProfile.followingCount=myFw+1;}
  await window.XF.push('notifications/'+fromUid,{type:'connection_accepted',fromUid:myUid,fromName:currentProfile?.displayName||'Member',createdAt:window.XF.ts(),read:false});
  showToast('Connection accepted!');
  // Re-render notifications so Accept/Decline buttons become Connected state
  renderNotifications();
}
async function declineConnection(reqId){await window.XF.update('connectionRequests/'+reqId,{status:'declined'});showToast('Request declined');renderNotifications();}
async function acceptConnectionFromNotif(reqId,fromUid,btn){
  // Disable buttons immediately for feedback
  const container=btn?.closest('[id^="connBtns_"]');
  if(container)container.innerHTML='<span style="color:var(--success);font-size:0.85rem;font-weight:600">✓ Connected</span>';
  await acceptConnection(reqId,fromUid);
}
async function disconnect(uid){
  if(!currentUser)return;
  await window.XF.remove('connections/'+currentUser.uid+'/'+uid);
  await window.XF.remove('connections/'+uid+'/'+currentUser.uid);
  const myF=(await window.XF.get('users/'+currentUser.uid+'/followersCount')).val()||0;
  const myFw=(await window.XF.get('users/'+currentUser.uid+'/followingCount')).val()||0;
  await window.XF.update('users/'+currentUser.uid,{followersCount:Math.max(0,myF-1),followingCount:Math.max(0,myFw-1)});
  if(currentProfile){currentProfile.followersCount=Math.max(0,myF-1);currentProfile.followingCount=Math.max(0,myFw-1);}
  showToast('Disconnected');renderDiscover();
}

/* ══════════════════════════════════════════════
   BLOCK USER
══════════════════════════════════════════════ */
async function blockUser(uid,displayName){
  if(!currentUser||uid===currentUser.uid)return;
  if(!confirm(`Block ${displayName||'this user'}? They won't be able to see your content and you won't see theirs.`))return;
  try{
    await window.XF.set('blocks/'+currentUser.uid+'/'+uid,{blockedAt:window.XF.ts(),displayName:displayName||''});
    // Remove connection if exists
    await window.XF.remove('connections/'+currentUser.uid+'/'+uid);
    await window.XF.remove('connections/'+uid+'/'+currentUser.uid);
    showToast('User blocked');
    goBack();
  }catch(e){showToast('Could not block user');}
}
async function unblockUser(uid,displayName){
  if(!currentUser)return;
  try{
    await window.XF.remove('blocks/'+currentUser.uid+'/'+uid);
    showToast(displayName+' unblocked');
  }catch(e){showToast('Could not unblock');}
}
async function getBlockedUids(){
  if(!currentUser)return new Set();
  try{
    const snap=await window.XF.get('blocks/'+currentUser.uid);
    return snap.exists()?new Set(Object.keys(snap.val())):new Set();
  }catch(e){return new Set();}
}
async function isBlocked(uid){
  if(!currentUser)return false;
  try{const s=await window.XF.get('blocks/'+currentUser.uid+'/'+uid);return s.exists();}
  catch(e){return false;}
}
async function searchUsers(query){
  const discoverContainer=$('searchResults');
  const sidebarContainer=$('sidebarSearchResults');
  const containers=[discoverContainer,sidebarContainer].filter(Boolean);
  if(!query||query.length<2){containers.forEach(c=>c.innerHTML='');return;}
  const snap=await window.XF.get('users');const results=[];
  if(snap.exists()){snap.forEach(c=>{const p=c.val();if(p.uid===currentUser?.uid)return;const q=query.toLowerCase();if((p.displayName||'').toLowerCase().includes(q)||(p.handle||'').toLowerCase().includes(q))results.push(p);});}
  const html=results.slice(0,8).map(p=>`<div class="people-card" onclick="openUserProfile('${p.uid}',event)">${avatarHTML(p,'sm')}<div class="people-card-info"><div class="people-card-name">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div><div class="people-card-handle">@${escapeHTML(p.handle||'member')}</div></div></div>`).join('');
  containers.forEach(c=>c.innerHTML=html);
}

/* ══════════════════════════════════════════════
   OWN PROFILE
══════════════════════════════════════════════ */
async function renderOwnProfile(){
  if(!currentUser||!currentProfile){showPage('login');return;}
  const container=$('ownProfileContent');if(!container)return;
  const postsSnap=await window.XF.get('posts');const posts=[];
  if(postsSnap.exists())postsSnap.forEach(c=>{const p=c.val();if(p.authorUid===currentUser.uid)posts.push({id:c.key,...p});});
  posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const followersVisible=!currentProfile.followersHidden;
  container.innerHTML=`
    <div class="profile-banner" style="position:relative">
      ${currentProfile.bannerURL?`<img src="${currentProfile.bannerURL}" style="width:100%;height:100%;object-fit:cover">`:'<div style="width:100%;height:100%;background:var(--bg-3)"></div>'}
      <label style="position:absolute;bottom:10px;right:10px;cursor:pointer;background:rgba(0,0,0,0.7);color:#fff;border-radius:9999px;padding:6px 12px;font-size:0.78rem;font-weight:600;display:flex;align-items:center;gap:4px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Cover<input type="file" accept="image/*" style="display:none" onchange="uploadBannerPhoto(this)">
      </label>
    </div>
    <div class="profile-info-section">
      <div class="profile-name-row">
        <div class="profile-avatar-wrap" style="position:relative">
          ${avatarHTML(currentProfile,'xl')}
          <label style="position:absolute;bottom:0;right:0;cursor:pointer;background:var(--bg-3);border:2px solid var(--bg);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center" title="Change photo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><input type="file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this)">
          </label>
        </div>
        <div style="display:flex;gap:8px;padding-top:12px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="showEditProfile()">Edit profile</button>
          <button class="btn btn-outline btn-sm" onclick="shareProfile()" title="Share profile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          ${!currentProfile.verified?`<button class="btn btn-accent btn-sm" onclick="showPaywall()">✓ Get Verified</button>`:''}
        </div>
      </div>
      <div class="profile-name">${escapeHTML(currentProfile.displayName||'Member')}${verifiedBadge(currentProfile.verified,true)}</div>
      <div class="profile-handle">@${escapeHTML(currentProfile.handle||'member')}</div>
      ${currentProfile.bio?`<div class="profile-bio">${escapeHTML(currentProfile.bio)}</div>`:'<div class="profile-bio text-dim">No bio yet</div>'}
      <div class="profile-stats">
        <div class="profile-stat"><strong>${formatCount(currentProfile.followersCount||0)}</strong> <span>Followers</span></div>
        <div class="profile-stat"><strong>${formatCount(currentProfile.followingCount||0)}</strong> <span>Following</span></div>
        <div class="profile-stat"><strong>${formatCount(currentProfile.postsCount||0)}</strong> <span>Posts</span></div>
      </div>
      <div class="privacy-toggle-row">
        <span class="privacy-toggle-label">⊛ Show my followers publicly</span>
        <label class="toggle-switch">
          <input type="checkbox" ${followersVisible?'checked':''} onchange="toggleFollowersPrivacy(this.checked)">
          <div class="toggle-track"></div><div class="toggle-thumb"></div>
        </label>
      </div>
    </div>
    <div class="profile-tabs">
      <div class="profile-tab active" onclick="switchOwnProfileTab('posts',this)">Posts</div>
      <div class="profile-tab" onclick="switchOwnProfileTab('media',this)">Media</div>
    </div>
    <div id="ownProfilePosts">
      ${posts.length===0?'<div class="empty-state"><div class="empty-state-desc">No posts yet — share something!</div></div>':posts.map(p=>p.type==='business'?businessPostHTML(p,currentProfile):postHTML(p,currentProfile)).join('')}
    </div>`;
  // Make banner & avatar clickable to view full size
  setTimeout(()=>makeProfilePhotosClickable(container,currentProfile),50);
  // Show who viewed my profile
  renderProfileViewers(currentUser.uid,container);
}
function switchOwnProfileTab(tab,el){
  document.querySelectorAll('#ownProfileContent .profile-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const container=$('ownProfilePosts');if(!container)return;
  container.querySelectorAll('.post').forEach(p=>{p.style.display=(tab==='media'&&!p.querySelector('.post-image'))?'none':'';});
}
async function uploadProfilePhoto(input){
  if(!input.files[0])return;showToast('Uploading photo…');
  try{
    const r=await window.XCloud.upload(input.files[0],'x_profiles');
    await window.XF.update('users/'+currentUser.uid,{photoURL:r.url});
    await window.XF.updateProfile({photoURL:r.url});
    currentProfile.photoURL=r.url;showToast('Profile photo updated!');
    renderOwnProfile();updateNavUser();updateComposerAvatar();
  }catch(err){showToast('Upload failed: '+err.message);}
}
async function uploadBannerPhoto(input){
  if(!input.files[0])return;showToast('Uploading cover…');
  try{
    const r=await window.XCloud.upload(input.files[0],'x_banners');
    await window.XF.update('users/'+currentUser.uid,{bannerURL:r.url});
    currentProfile.bannerURL=r.url;showToast('Cover photo updated!');renderOwnProfile();
  }catch(err){showToast('Upload failed: '+err.message);}
}
function showEditProfile(){
  if(!currentProfile)return;
  $('editDisplayName').value=currentProfile.displayName||'';
  $('editBio').value=currentProfile.bio||'';
  const hf=$('editHandle');if(hf)hf.value=currentProfile.handle||'';
  $('editProfileModal').classList.add('open');
}
async function saveProfile(){
  const name=$('editDisplayName').value.trim(),bio=$('editBio').value.trim();
  if(!name)return showToast('Name cannot be empty');
  const updates={displayName:name,bio};
  const hf=$('editHandle');
  if(hf){
    const newHandle=hf.value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    if(newHandle&&newHandle!==currentProfile.handle){
      if(newHandle.length<3){showToast('Handle must be at least 3 characters');return;}
      const snap=await window.XF.get('handles/'+newHandle);
      if(snap.exists()){showToast('@'+newHandle+' is already taken');return;}
      await window.XF.remove('handles/'+currentProfile.handle);
      await window.XF.set('handles/'+newHandle,currentUser.uid);
      updates.handle=newHandle;
    }
  }
  await window.XF.update('users/'+currentUser.uid,updates);
  await window.XF.updateProfile({displayName:name});
  Object.assign(currentProfile,updates);
  closeModal('editProfileModal');showToast('Profile updated');renderOwnProfile();updateNavUser();
}
async function toggleFollowersPrivacy(checked){
  if(!currentUser)return;
  await window.XF.update('users/'+currentUser.uid,{followersHidden:!checked});
  currentProfile.followersHidden=!checked;
  showToast(checked?'Followers list is now public':'Followers list hidden');
}

/* ══════════════════════════════════════════════
   USER PROFILE
══════════════════════════════════════════════ */
async function openUserProfile(uid,e){
  if(e)e.stopPropagation();
  if(uid===currentUser?.uid){showPage('profile');return;}
  showPage('user-profile',{uid});
}
async function renderUserProfile(uid){
  const container=$('userProfileContent');if(!container||!uid)return;
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    // Check if this user is blocked by me
    const blocked=await isBlocked(uid);

    const snap=await window.XF.get('users/'+uid);
    if(!snap.exists()){container.innerHTML='<div class="empty-state"><div class="empty-state-title">User not found</div></div>';return;}
    const profile=snap.val();

    if(blocked){
      container.innerHTML=`<div class="empty-state" style="padding:48px 24px">
        <div class="empty-state-icon" style="font-size:2.5rem">🚫</div>
        <div class="empty-state-title">You've blocked this user</div>
        <div class="empty-state-desc">They can't see your content and you won't see theirs.</div>
        <button class="btn btn-outline btn-sm" style="margin-top:20px" onclick="unblockUser('${uid}','${escapeHTML(profile.displayName||'Member')}').then(()=>renderUserProfile('${uid}'))">Unblock</button>
      </div>`;
      return;
    }

    let connStatus='none';
    if(currentUser){
      const cs=await window.XF.get('connections/'+currentUser.uid+'/'+uid);
      if(cs.exists())connStatus='connected';
      else{const rs=await window.XF.get('connectionRequests/'+currentUser.uid+'_'+uid);if(rs.exists()&&rs.val().status==='pending')connStatus='pending';}
    }
    const postsSnap=await window.XF.get('posts');const posts=[];
    if(postsSnap.exists())postsSnap.forEach(c=>{const p=c.val();if(p.authorUid===uid)posts.push({id:c.key,...p});});
    posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const followersHidden=profile.followersHidden&&uid!==currentUser?.uid;
    container.innerHTML=`
      <div class="profile-banner">
        ${profile.bannerURL?`<img src="${profile.bannerURL}" style="width:100%;height:100%;object-fit:cover">`:'<div style="width:100%;height:100%;background:var(--bg-3)"></div>'}
      </div>
      <div class="profile-info-section">
        <div class="profile-name-row">
          <div class="profile-avatar-wrap">${avatarHTML(profile,'xl')}</div>
          <div style="display:flex;gap:8px;padding-top:12px;flex-wrap:wrap">
            ${currentUser&&uid!==currentUser.uid?connectBtnHTML(uid,connStatus):''}
            ${!currentUser?`<button class="btn btn-primary btn-sm" onclick="showPage('register')">Connect</button>`:''}
            ${connStatus==='connected'?`<button class="btn btn-outline btn-sm" onclick="openDMWith('${uid}')">Message</button>`:''}
            <button class="btn btn-outline btn-sm" onclick="shareUserProfile('${uid}','${escapeHTML(profile.displayName||'Member')}','${escapeHTML(profile.handle||uid)}')" title="Share profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            ${currentUser&&uid!==currentUser.uid?`<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="blockUser('${uid}','${escapeHTML(profile.displayName||'Member')}')">🚫 Block</button>`:''}
          </div>
        </div>
        <div class="profile-name">${escapeHTML(profile.displayName||'Member')}${verifiedBadge(profile.verified,true)}</div>
        <div class="profile-handle">@${escapeHTML(profile.handle||'member')}</div>
        ${profile.bio?`<div class="profile-bio">${escapeHTML(profile.bio)}</div>`:''}
        <div class="profile-stats">
          <div class="profile-stat"><strong>${followersHidden?'⊘':formatCount(profile.followersCount||0)}</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong>${formatCount(profile.followingCount||0)}</strong> <span>Following</span></div>
          <div class="profile-stat"><strong>${formatCount(profile.postsCount||0)}</strong> <span>Posts</span></div>
        </div>
      </div>
      <div class="profile-tabs">
        <div class="profile-tab active" onclick="switchUserProfileTab('posts',this)">Posts</div>
        <div class="profile-tab" onclick="switchUserProfileTab('media',this)">Media</div>
      </div>
      <div id="userProfilePosts">
        ${posts.length===0?'<div class="empty-state"><div class="empty-state-desc">No posts yet</div></div>':posts.map(p=>p.type==='business'?businessPostHTML(p,profile):postHTML(p,profile)).join('')}
      </div>`;
    recordProfileView(uid);
    setTimeout(()=>makeProfilePhotosClickable(container,profile),50);
    renderProfileViewers(uid,container);
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load profile</div></div>';}
}
function switchUserProfileTab(tab,el){
  document.querySelectorAll('#userProfileContent .profile-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const container=$('userProfilePosts');if(!container)return;
  container.querySelectorAll('.post').forEach(p=>{p.style.display=(tab==='media'&&!p.querySelector('.post-image'))?'none':'';});
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════ */
async function renderNotifications(){
  const container=$('notifList');if(!container||!currentUser)return;
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const snap=await window.XF.get('notifications/'+currentUser.uid);
  const notifs=[];if(snap.exists())snap.forEach(c=>notifs.push({id:c.key,...c.val()}));
  notifs.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(notifs.length===0){container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">⍾</div><div class="empty-state-title">No notifications yet</div></div>`;return;}

  // Pre-fetch connection + request status for all connection_request notifs in one pass
  const connReqNotifs=notifs.filter(n=>n.type==='connection_request'&&n.reqId&&n.fromUid);
  const connStatusMap={};
  await Promise.all(connReqNotifs.map(async n=>{
    // Check if already connected
    const cs=await window.XF.get('connections/'+currentUser.uid+'/'+n.fromUid);
    if(cs.exists()){connStatusMap[n.reqId]='connected';return;}
    // Check request status (accepted / declined / pending)
    const rs=await window.XF.get('connectionRequests/'+n.reqId);
    connStatusMap[n.reqId]=rs.exists()?rs.val().status:'pending';
  }));

  // Deduplicate: for each sender only show the latest connection_request notif
  const seenConnReq=new Set();
  const deduped=notifs.filter(n=>{
    if(n.type!=='connection_request')return true;
    if(seenConnReq.has(n.fromUid))return false;
    seenConnReq.add(n.fromUid);return true;
  });

  container.innerHTML=deduped.map(n=>{
    const u=n.read?'':'unread';
    if(n.type==='connection_request'){
      const status=connStatusMap[n.reqId]||'pending';
      let actionHTML='';
      if(status==='connected'||status==='accepted'){
        actionHTML=`<div style="margin-top:8px"><span style="color:var(--success);font-size:0.85rem;font-weight:600">✓ Connected</span></div>`;
      }else if(status==='declined'){
        actionHTML=`<div style="margin-top:8px"><span style="color:var(--text-dim);font-size:0.85rem">Request declined</span></div>`;
      }else{
        actionHTML=`<div id="connBtns_${n.reqId}" style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary btn-sm" onclick="acceptConnectionFromNotif('${n.reqId}','${n.fromUid}',this)">Accept</button><button class="btn btn-outline btn-sm" onclick="declineConnection('${n.reqId}')">Decline</button></div>`;
      }
      return`<div class="notif-item ${u}"><div class="notif-icon">🤝</div><div style="flex:1"><div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> wants to connect with you</div><div class="notif-time">${timeAgo(n.createdAt)}</div>${actionHTML}</div></div>`;
    }
    if(n.type==='connection_accepted')return`<div class="notif-item ${u}"><div class="notif-icon">✅</div><div style="flex:1"><div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> accepted your connection request</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`;
    if(n.type==='new_message')return`<div class="notif-item ${u}" onclick="openDMWith('${n.fromUid}')"><div class="notif-icon">💬</div><div style="flex:1"><div class="notif-text"><strong>${escapeHTML(n.fromName)}</strong> sent you a message${n.preview?': '+escapeHTML(n.preview):''}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`;
    return`<div class="notif-item ${u}"><div class="notif-icon">🔔</div><div style="flex:1"><div class="notif-text">${escapeHTML(n.text||'New notification')}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`;
  }).join('');

  // Mark ALL as read after 2s — including new_message notifs so badge resets properly
  setTimeout(async()=>{
    const unread=notifs.filter(n=>!n.read);
    if(unread.length>0){
      await Promise.all(unread.map(n=>window.XF.update('notifications/'+currentUser.uid+'/'+n.id,{read:true})));
      ['navNotifBadge','mobileNotifBadge'].forEach(id=>{const b=$(id);if(b){b.textContent='0';b.style.display='none';}});
    }
  },2000);
}
function startNotifWatch(){
  if(!currentUser)return;
  window.XF.on('notifications/'+currentUser.uid,snap=>{
    let unread=0;if(snap.exists())snap.forEach(c=>{if(!c.val().read)unread++;});
    ['navNotifBadge','mobileNotifBadge'].forEach(id=>{const b=$(id);if(!b)return;b.textContent=unread;b.style.display=unread>0?'flex':'none';});
  });
}
async function startMsgWatch(){
  if(!currentUser)return;
  // Poll unread DM count every 15s and on connection change
  refreshMsgBadge();
  setInterval(refreshMsgBadge,15000);
}

/* ══════════════════════════════════════════════
   MESSAGES  (fully fixed — full-page DM)
══════════════════════════════════════════════ */
async function renderConversations(){
  const container=$('convList');if(!container)return;
  // Show list view, hide DM pane
  const lv=$('messagesListView'),dp=$('dmFullpage');
  if(lv)lv.style.display='block';
  if(dp)dp.style.display='none';
  if(!currentUser){container.innerHTML='';return;}
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const connSnap=await window.XF.get('connections/'+currentUser.uid);
    if(!connSnap.exists()||Object.keys(connSnap.val()).length===0){
      container.innerHTML=`<div class="empty-state" style="padding:32px 16px"><div class="empty-state-icon">◈</div><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">Connect with members to start chatting</div></div>`;return;
    }
    const uids=Object.keys(connSnap.val());
    const profiles={};
    await Promise.all(uids.map(async uid=>{const s=await window.XF.get('users/'+uid);if(s.exists())profiles[uid]=s.val();}));
    const previews={};
    const unreadCounts={};
    await Promise.all(uids.map(async uid=>{
      const convId=[currentUser.uid,uid].sort().join('_');
      const dmSnap=await window.XF.get('dms/'+convId);
      if(dmSnap.exists()){
        const msgs=[];dmSnap.forEach(c=>msgs.push({id:c.key,...c.val()}));
        if(msgs.length>0)previews[uid]=msgs[msgs.length-1];
        unreadCounts[uid]=msgs.filter(m=>m.senderUid!==currentUser.uid&&(!m.readBy||!m.readBy[currentUser.uid])).length;
      }
    }));
    container.innerHTML=uids.map(uid=>{
      const p=profiles[uid];if(!p)return'';
      const preview=previews[uid];
      const unread=unreadCounts[uid]||0;
      const previewText=preview?(preview.imageUrl?'📷 Photo':String(preview.text||'').slice(0,40)):'Start a conversation';
      const ts=preview?.createdAt?timeAgo(preview.createdAt):'';
      return`<div class="conversation-item${unread>0?' unread-conv':''}" onclick="openDMWith('${uid}')" data-uid="${uid}">
        ${avatarHTML(p,'md')}
        <div class="conv-info">
          <div class="conv-name-row">
            <div class="conv-name${unread>0?' conv-name-bold':''}">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div>
            ${ts?`<div class="conv-time">${ts}</div>`:''}
          </div>
          <div class="conv-preview-row">
            <div class="conv-preview${unread>0?' conv-preview-unread':''}">${escapeHTML(previewText)}</div>
            ${unread>0?`<div class="conv-unread-badge">${unread}</div>`:''}
          </div>
        </div>
      </div>`;
    }).filter(Boolean).join('');
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load conversations</div></div>';}
}
let _typingUnsubscribe=null,_typingTimer=null;
async function openDMWith(uid){
  if(msgUnsubscribe){try{msgUnsubscribe();}catch(e){}msgUnsubscribe=null;}
  if(_typingUnsubscribe){try{_typingUnsubscribe();}catch(e){}}_typingUnsubscribe=null;
  if(activePage!=='messages')showPage('messages');
  activeConvUid=uid;
  const snap=await window.XF.get('users/'+uid);const partner=snap.exists()?snap.val():null;
  const lv=$('messagesListView'),dp=$('dmFullpage');
  if(lv)lv.style.display='none';
  if(!dp)return;
  dp.style.display='flex';
  const hdr=$('dmFullpageHeader');
  if(hdr)hdr.innerHTML=`
    <div class="dm-back-btn" onclick="closeDMFullpage()">←</div>
    <div onclick="openUserProfile('${uid}',event)" style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1">
      ${avatarHTML(partner,'md')}
      <div>
        <div style="display:flex;align-items:center;gap:4px;font-weight:700">${escapeHTML(partner?.displayName||'Member')}${verifiedBadge(partner?.verified)}</div>
        <div style="font-size:0.8rem;color:var(--text-dim)" id="dmOnlineStatus">@${escapeHTML(partner?.handle||'member')}</div>
      </div>
    </div>`;
  const dmInput=$('dmInput');
  if(dmInput){
    dmInput.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendDMText(uid);}};
    dmInput.oninput=function(){sendTypingIndicator(uid);};
    dmInput.value='';
  }
  const sendBtn=dp.querySelector('.dm-send-btn');if(sendBtn)sendBtn.onclick=()=>sendDMText(uid);
  const imgInput=$('dmImgInput');if(imgInput){imgInput.value='';imgInput.onchange=function(){handleDMImagePreview(this,uid);};}
  const msgEl=$('dmMessages');
  const convId=[currentUser.uid,uid].sort().join('_');
  // Mark messages read
  markMessagesRead(convId);
  // Listen for partner typing
  _typingUnsubscribe=window.XF.on('typing/'+convId+'/'+uid,snap=>{
    const statusEl=$('dmOnlineStatus');if(!statusEl)return;
    if(snap.exists()&&snap.val()===true){
      statusEl.textContent='typing…';statusEl.style.color='var(--accent)';
    }else{
      statusEl.textContent='@'+escapeHTML(partner?.handle||'member');statusEl.style.color='var(--text-dim)';
    }
  });
  // Live messages
  msgUnsubscribe=window.XF.on('dms/'+convId,snap=>{
    const msgs=[];if(snap.exists())snap.forEach(c=>msgs.push({id:c.key,...c.val()}));
    if(!msgEl)return;
    if(msgs.length===0){msgEl.innerHTML=`<div style="text-align:center;color:var(--text-dim);font-size:0.85rem;margin-top:40px">Start the conversation!</div>`;return;}
    markMessagesRead(convId);
    msgEl.innerHTML=msgs.map(m=>{
      const isMe=m.senderUid===currentUser.uid;
      const imgHTML=m.imageUrl?`<img src="${escapeHTML(m.imageUrl)}" onclick="openLightbox('${escapeHTML(m.imageUrl)}')" alt="photo">`:'';
      const txtHTML=m.text?`<span>${escapeHTML(m.text)}</span>`:'';
      const ts=m.createdAt?`<span class="msg-time">${timeAgo(m.createdAt)}</span>`:'';
      let statusMark='';
      if(isMe){
        const isRead=m.readBy&&Object.keys(m.readBy).some(k=>k!==currentUser.uid);
        statusMark=isRead?`<span class="msg-tick read" title="Read">✓✓</span>`:`<span class="msg-tick sent" title="Sent">✓✓</span>`;
      }
      const deleteAttr=isMe?`data-msgid="${m.id}" data-convid="${convId}" oncontextmenu="showMsgDeleteMenu(event,this)" ontouchstart="startMsgHold(event,this)" ontouchend="cancelMsgHold()" ontouchmove="cancelMsgHold()"`:'';
      return`<div class="chat-msg-wrap${isMe?' me':' them'}" ${deleteAttr}>
        ${!isMe?`<div class="chat-msg-avatar">${avatarHTML(partner,'sm')}</div>`:''}
        <div class="chat-msg-col">
          <div class="chat-msg${isMe?' me':' them'}">${imgHTML}${txtHTML}</div>
          <div class="msg-meta${isMe?' me':''}">${ts}${statusMark}</div>
        </div>
      </div>`;
    }).join('');
    msgEl.scrollTop=msgEl.scrollHeight;
  });
}
function sendTypingIndicator(uid){
  if(!currentUser||!uid)return;
  const convId=[currentUser.uid,uid].sort().join('_');
  window.XF.set('typing/'+convId+'/'+currentUser.uid,true).catch(()=>{});
  clearTimeout(_typingTimer);
  _typingTimer=setTimeout(()=>{window.XF.set('typing/'+convId+'/'+currentUser.uid,false).catch(()=>{});},2500);
}
async function markMessagesRead(convId){
  if(!currentUser)return;
  try{
    const snap=await window.XF.get('dms/'+convId);if(!snap.exists())return;
    const updates={};
    snap.forEach(c=>{
      const m=c.val();
      if(m.senderUid!==currentUser.uid&&(!m.readBy||!m.readBy[currentUser.uid])){
        updates['dms/'+convId+'/'+c.key+'/readBy/'+currentUser.uid]=true;
      }
    });
    if(Object.keys(updates).length>0){
      await window.XF.multiUpdate(updates);
      // Refresh badge
      setTimeout(refreshMsgBadge,500);
    }
  }catch(e){}
}
async function refreshMsgBadge(){
  if(!currentUser)return;
  try{
    const connSnap=await window.XF.get('connections/'+currentUser.uid);
    if(!connSnap.exists())return;
    const uids=Object.keys(connSnap.val());
    let total=0;
    await Promise.all(uids.map(async uid=>{
      const convId=[currentUser.uid,uid].sort().join('_');
      const dmSnap=await window.XF.get('dms/'+convId);if(!dmSnap.exists())return;
      dmSnap.forEach(c=>{const m=c.val();if(m.senderUid!==currentUser.uid&&(!m.readBy||!m.readBy[currentUser.uid]))total++;});
    }));
    ['navMsgBadge','mobileMsgBadge'].forEach(id=>{const b=$(id);if(!b)return;b.textContent=total;b.style.display=total>0?'flex':'none';});
  }catch(e){}
}
function handleDMImagePreview(inputEl,uid){
  if(!inputEl?.files?.[0])return;
  const preview=$('dmImgPreview');
  if(preview){
    const reader=new FileReader();
    reader.onload=e=>{
      preview.innerHTML=`<div class="img-preview-wrap" style="margin:6px 0 0 4px"><img src="${e.target.result}" style="max-width:120px;max-height:120px;border-radius:8px"><div class="img-preview-remove" onclick="cancelDMImage()">✕</div></div>`;
    };
    reader.readAsDataURL(inputEl.files[0]);
  }else{
    sendDMImage(inputEl,uid);
  }
}
function cancelDMImage(){const p=$('dmImgPreview');if(p)p.innerHTML='';const i=$('dmImgInput');if(i)i.value='';}

/* ── Message delete (long-press / right-click on own messages) ── */
let _msgHoldTimer=null;
function startMsgHold(e,el){
  _msgHoldTimer=setTimeout(()=>{showMsgDeleteMenu(e,el);},500);
}
function cancelMsgHold(){clearTimeout(_msgHoldTimer);}
function showMsgDeleteMenu(e,el){
  e.preventDefault();e.stopPropagation();
  // Remove any existing menu
  document.querySelectorAll('.msg-ctx-menu').forEach(m=>m.remove());
  const msgId=el.dataset.msgid,convId=el.dataset.convid;
  if(!msgId||!convId)return;
  const menu=document.createElement('div');
  menu.className='msg-ctx-menu';
  menu.innerHTML=`<div class="msg-ctx-item delete" onclick="deleteDMMessage('${convId}','${msgId}')">🗑 Delete message</div>`;
  // Position near tap/click
  const rect=el.getBoundingClientRect();
  menu.style.cssText=`position:fixed;top:${Math.min(rect.bottom+4,window.innerHeight-60)}px;${rect.left>window.innerWidth/2?'right:'+(window.innerWidth-rect.right)+'px':'left:'+rect.left+'px'};z-index:9999`;
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',function h(){menu.remove();document.removeEventListener('click',h);},{once:true}),50);
}
async function deleteDMMessage(convId,msgId){
  document.querySelectorAll('.msg-ctx-menu').forEach(m=>m.remove());
  try{
    // Delete silently — no notification to recipient
    await window.XF.remove('dms/'+convId+'/'+msgId);
    // No toast — silent delete like WhatsApp
  }catch(e){showToast('Could not delete message');}
}
function closeDMFullpage(){
  if(msgUnsubscribe){try{msgUnsubscribe();}catch(e){}msgUnsubscribe=null;}
  if(_typingUnsubscribe){try{_typingUnsubscribe();}catch(e){}}_typingUnsubscribe=null;
  if(_typingTimer){clearTimeout(_typingTimer);_typingTimer=null;}
  // Clear typing flag for ourselves
  if(currentUser&&activeConvUid){
    const convId=[currentUser.uid,activeConvUid].sort().join('_');
    window.XF.set('typing/'+convId+'/'+currentUser.uid,false).catch(()=>{});
  }
  activeConvUid=null;
  const lv=$('messagesListView'),dp=$('dmFullpage');
  if(dp)dp.style.display='none';
  if(lv)lv.style.display='block';
  renderConversations();
}
async function sendDMText(uid){
  uid=uid||activeConvUid;if(!uid||!currentUser)return;
  const input=$('dmInput');const text=input?.value?.trim();if(!text)return;
  if(!currentProfile?.verified){
    const today=new Date().toISOString().slice(0,10);
    const limitKey='xclub_msg_'+currentUser.uid+'_'+today;
    const sentToday=parseInt(localStorage.getItem(limitKey)||'0');
    const DAILY_LIMIT=10;
    if(sentToday>=DAILY_LIMIT){showToast('Message limit reached — get verified for unlimited messages');return;}
    localStorage.setItem(limitKey,String(sentToday+1));
    const remaining=DAILY_LIMIT-sentToday-1;if(remaining<=3)showToast(remaining+' free messages remaining today');
  }
  // Clear input immediately for responsiveness
  if(input)input.value='';
  const convId=[currentUser.uid,uid].sort().join('_');
  window.XF.set('typing/'+convId+'/'+currentUser.uid,false).catch(()=>{});
  clearTimeout(_typingTimer);
  try{
    await window.XF.push('dms/'+convId,{senderUid:currentUser.uid,text,createdAt:window.XF.ts(),readBy:{[currentUser.uid]:true}});
    notifyDMRecipient(uid,text);
    refreshMsgBadge();
  }catch(err){
    // Restore the unsent text so user doesn't lose it
    if(input)input.value=text;
    showToast('Failed to send — check your connection');
    console.error('[DM] send failed:',err);
  }
}
async function notifyDMRecipient(toUid,preview){
  try{
    // Check if they already have the conversation open — if not, badge them
    await window.XF.push('notifications/'+toUid,{type:'new_message',fromUid:currentUser.uid,fromName:currentProfile?.displayName||'Member',preview:(preview||'').slice(0,40),createdAt:window.XF.ts(),read:false});
  }catch(e){}
}
async function sendDMImage(inputEl,uid){
  uid=uid||activeConvUid;if(!uid||!currentUser||!inputEl?.files?.[0])return;
  showToast('Uploading image…');
  try{
    const r=await window.XCloud.upload(inputEl.files[0],'dm_images');
    const convId=[currentUser.uid,uid].sort().join('_');
    await window.XF.push('dms/'+convId,{senderUid:currentUser.uid,imageUrl:r.url,text:'',createdAt:window.XF.ts(),readBy:{[currentUser.uid]:true}});
    inputEl.value='';
    const p=$('dmImgPreview');if(p)p.innerHTML='';
    notifyDMRecipient(uid,'📷 Photo');
    refreshMsgBadge();
  }catch(e){showToast('Failed to send image — check your connection');console.error('[DM] image send failed:',e);}
}


/* ══════════════════════════════════════════════
   BUSINESS / INVESTMENT POSTS
══════════════════════════════════════════════ */
function businessPostHTML(post,author){
  const isOwner=currentUser&&post.authorUid===currentUser.uid;
  const raised=post.bizRaised||0,target=post.bizTarget||1;
  const pct=Math.min(100,Math.round((raised/target)*100));
  const isLiked=currentUser&&post.likes&&post.likes[currentUser.uid];
  const likeCount=post.likes?Object.keys(post.likes).length:0;
  return`<div class="post" data-id="${post.id}">
    <div onclick="openUserProfile('${post.authorUid}',event)">${avatarHTML(author,'md')}</div>
    <div class="post-body">
      <div class="post-header">
        <span class="post-name">${escapeHTML(author?.displayName||'Unknown')}</span>${verifiedBadge(author?.verified)}
        <span class="post-handle">@${escapeHTML(author?.handle||'unknown')}</span>
        <span class="post-time">· ${timeAgo(post.createdAt)}</span>
        ${isOwner?`<span onclick="event.stopPropagation();deletePost('${post.id}')" style="margin-left:auto;color:var(--text-dim);cursor:pointer;font-size:0.8rem;padding:2px 8px" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-dim)'">✕</span>`:''}
      </div>
      <div class="post-text">${escapeHTML(post.text||'')}</div>
      <div class="post-invest-card">
        <div class="post-invest-header"><span class="post-invest-badge">▣ INVESTMENT OPPORTUNITY</span>${post.bizSector?`<span style="font-size:0.75rem;color:var(--text-dim)">${escapeHTML(post.bizSector)}</span>`:''}</div>
        <div class="post-invest-title">${escapeHTML(post.bizTitle||'')}</div>
        <div class="post-invest-target">Target: ${currencySymbol(post.bizCurrency)}${Number(target).toLocaleString()} ${post.bizCurrency||'EUR'}</div>
        <div class="invest-progress-bar"><div class="invest-progress-fill" style="width:${pct}%"></div></div>
        <div class="invest-stats"><span>${pct}% funded</span><span>${post.investorCount||0} investors</span></div>
        <div class="invest-raised">${currencySymbol(post.bizCurrency)}${Number(raised).toLocaleString()} raised</div>
        <div class="invest-actions" style="margin-top:12px">
          ${!isOwner?`<div class="invest-btn" onclick="openInvestModal('${post.id}')">◈ Invest Now</div>`:''}
          ${isOwner?`<button class="invest-manage-btn" onclick="openManageInvest('${post.id}')">⊞ Manage Investment</button>`:''}
        </div>
      </div>
      <div class="post-actions" onclick="event.stopPropagation()">
        <div class="post-action like${isLiked?' liked':''}" onclick="toggleLike('${post.id}',this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likeCount>0?' '+formatCount(likeCount):''}</div>
        <div class="post-action share" onclick="sharePost('${post.id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      </div>
    </div>
  </div>`;
}
async function openInvestModal(postId){
  if(!requireVerified('invest'))return;
  const snap=await window.XF.get('posts/'+postId);if(!snap.exists())return;
  const post=snap.val();const raised=post.bizRaised||0,target=post.bizTarget||1;
  const pct=Math.min(100,Math.round((raised/target)*100));
  const currency=post.bizCurrency||'EUR',sym=currencySymbol(currency);
  const isLarge=['NGN','TZS','UGX','RWF'].includes(currency);
  const amts=isLarge?[50000,100000,250000,500000,1000000,2500000]:[500,1000,2500,5000,10000,25000];
  const body=$('investModalBody');$('investModalTitle').textContent=post.bizTitle||'Invest';
  body.innerHTML=`
    <div class="invest-modal-raised">${sym}${Number(raised).toLocaleString()}</div>
    <div class="invest-modal-target">raised of ${sym}${Number(target).toLocaleString()} target · ${pct}% funded</div>
    <div class="invest-progress-bar" style="margin-bottom:20px"><div class="invest-progress-fill" style="width:${pct}%"></div></div>
    <div style="font-size:0.88rem;color:var(--text-dim);margin-bottom:12px;font-weight:600">Choose an amount (${currency}):</div>
    <div class="invest-amount-grid">${amts.map(a=>`<div class="invest-amount-btn" onclick="selectInvestAmount(this,${a})">${sym}${a.toLocaleString()}</div>`).join('')}</div>
    <div class="form-group" style="margin-bottom:16px"><input id="customInvestAmt" class="form-input" type="number" placeholder="Or enter custom amount (${currency})" min="1"></div>
    <button class="btn btn-primary btn-block" onclick="confirmInvestment('${postId}')">Pay via Flutterwave →</button>
    <div style="font-size:0.76rem;color:var(--text-muted);margin-top:12px;text-align:center">You'll be taken to Flutterwave's secure checkout.</div>`;
  $('investModal').classList.add('open');
}
function selectInvestAmount(el,amount){document.querySelectorAll('.invest-amount-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');selectedInvestAmount=amount;$('customInvestAmt').value='';}
async function confirmInvestment(postId){
  const customVal=parseFloat($('customInvestAmt').value);const amount=customVal>0?customVal:selectedInvestAmount;
  if(!amount||amount<=0)return showToast('Please select or enter an amount');
  const snap=await window.XF.get('posts/'+postId);if(!snap.exists())return;
  const post={id:postId,...snap.val()};
  // Check user hasn't already invested (prevent duplicate counts)
  const existingInv=await window.XF.get('investments/'+postId+'/'+currentUser.uid);
  if(existingInv.exists()&&existingInv.val().status==='paid'){
    showToast('You have already invested in this opportunity');return;
  }
  closeModal('investModal');showToast('Redirecting to payment…');
  setTimeout(()=>launchFlutterwave(post,amount),600);
}
async function openManageInvest(postId){
  const snap=await window.XF.get('posts/'+postId);if(!snap.exists())return;const post=snap.val();
  const body=$('manageInvestBody');
  body.innerHTML=`
    <div style="margin-bottom:16px">
      <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:6px">Current amount raised</div>
      <div style="font-size:2rem;font-weight:800;color:var(--success)">${currencySymbol(post.bizCurrency)}${Number(post.bizRaised||0).toLocaleString()} ${post.bizCurrency||'EUR'}</div>
      <div style="font-size:0.8rem;color:var(--text-dim)">${post.investorCount||0} investors · target ${currencySymbol(post.bizCurrency)}${Number(post.bizTarget||0).toLocaleString()}</div>
    </div>
    <div class="form-group"><label class="form-label">Set raised amount manually</label><input id="manageRaisedInput" class="form-input" type="number" value="${post.bizRaised||0}" min="0"></div>
    <div class="form-group"><label class="form-label">Set investor count manually</label><input id="manageCountInput" class="form-input" type="number" value="${post.investorCount||0}" min="0"></div>
    <button class="btn btn-primary btn-block" onclick="saveManageInvest('${postId}')">Save Changes</button>`;
  $('manageInvestModal').classList.add('open');
}
async function saveManageInvest(postId){
  const raised=parseInt($('manageRaisedInput').value)||0,count=parseInt($('manageCountInput').value)||0;
  try{await window.XF.update('posts/'+postId,{bizRaised:raised,investorCount:count});closeModal('manageInvestModal');showToast('Investment updated!');renderFeed();}
  catch(err){showToast('Failed to update');}
}

/* ══════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════ */
async function loadSuggested(){
  const c=$('suggestedMembers');if(!c||!window.XF)return;
  try{
    const snap=await window.XF.get('users');const people=[];
    if(snap.exists())snap.forEach(s=>{if(s.key!==currentUser?.uid)people.push(s.val());});
    const shown=people.filter(p=>p.verified).slice(0,3).concat(people.filter(p=>!p.verified).slice(0,2)).slice(0,4);
    if(shown.length===0){c.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">No members yet</div>';return;}
    c.innerHTML=shown.map(p=>`<div class="sidebar-item" onclick="openUserProfile('${p.uid}',event)" style="display:flex;align-items:center;gap:10px">${avatarHTML(p,'sm')}<div style="min-width:0;flex:1"><div style="font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:3px">${escapeHTML(p.displayName||'Member')}${verifiedBadge(p.verified)}</div><div style="color:var(--text-dim);font-size:0.78rem">@${escapeHTML(p.handle||'member')}</div></div>${p.uid!==currentUser?.uid?`<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();sendConnectionRequest('${p.uid}')" style="font-size:0.75rem;padding:4px 10px">Connect</button>`:''}</div>`).join('');
  }catch(e){}
}
async function loadBizFeed(){
  const container=$('bizFeedContainer');if(!container)return;
  container.innerHTML='<div class="bizfeed-loading"><div class="spinner"></div> Loading…</div>';
  try{
    const raw=await callGroq({system:`You are a business intelligence service. Generate exactly 4 short business news snippets about oil & gas, emerging markets, tech, real estate, or global finance. Each: 1-2 sentences, confident insider tone. Respond ONLY with raw JSON array, no markdown: [{"tag":"oil","text":"..."},{"tag":"investment","text":"..."},{"tag":"tech","text":"..."},{"tag":"market","text":"..."}]. Valid tags: oil, investment, tech, market`,user:'Generate 4 fresh business intelligence snippets.',maxTokens:800});
    const items=JSON.parse(raw.replace(/```json|```/g,'').trim());
    container.innerHTML=items.map(item=>`<div class="bizfeed-item"><div class="bizfeed-author">${claudeEngineerAvatarHTML('sm')}<div><div class="bizfeed-name">Claude Engineer <span style="color:var(--accent);font-size:0.72rem">✓</span></div><div class="bizfeed-time">@claudeengineer</div></div></div><span class="bizfeed-tag ${escapeHTML(item.tag)}">${escapeHTML(item.tag.toUpperCase())}</span><div class="bizfeed-text">${escapeHTML(item.text)}</div></div>`).join('');
  }catch(err){container.innerHTML='<div style="font-size:0.8rem;color:var(--text-dim);padding:8px">Could not load insights — add Groq key in Admin panel.</div>';}
}
async function postClaudeEngineerToFeed(){
  try{
    const text=await callGroq({system:`You are Claude Engineer, a business intelligence account on X Club. Write ONE sharp post (2-4 sentences) about something interesting in business, finance, tech, oil & gas, real estate, or emerging markets. Confident, analytical tone. No hashtags. No emojis. Respond with ONLY the post text.`,user:'Write a sharp business post.',maxTokens:512});
    if(!text)return;
    await window.XF.push('posts',{authorUid:CLAUDE_ENGINEER_UID,text,type:'post',isBot:true,createdAt:Date.now(),commentCount:0});
  }catch(err){console.warn('Claude Engineer post failed:',err);}
}

/* ══════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════ */
function closeModal(id){const m=$(id);if(m)m.classList.remove('open');}

/* ══════════════════════════════════════════════
   ADMIN
══════════════════════════════════════════════ */
function switchAdminTab(tab,el){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  $('adminTabUsers').style.display=tab==='users'?'block':'none';
  $('adminTabPosts').style.display=tab==='posts'?'block':'none';
  $('adminTabStats').style.display=tab==='stats'?'block':'none';
  if(tab==='stats'){loadAdminStats();loadScheduledPostsAdmin();}
  if(tab==='posts'){adminLoadPosts();}
}
async function loadAdminUsers(){
  const container=$('adminUserList');if(!container)return;
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const snap=await window.XF.get('users');allUsersCache=[];
    if(snap.exists())snap.forEach(c=>{const v=c.val();if(v&&typeof v==='object')allUsersCache.push({id:c.key,uid:v.uid||c.key,...v});});
    allUsersCache.sort((a,b)=>(b.joinedAt||0)-(a.joinedAt||0));
    // Fetch unread message counts per user
    const unreadMap={};
    await Promise.all(allUsersCache.map(async u=>{
      try{
        const dmsSnap=await window.XF.get('dms');
        if(!dmsSnap.exists())return;
        let count=0;
        dmsSnap.forEach(conv=>{
          if(!conv.key.includes(u.uid))return;
          conv.forEach(msg=>{
            const m=msg.val();
            if(m.senderUid!==u.uid&&(!m.readBy||!m.readBy[u.uid]))count++;
          });
        });
        if(count>0)unreadMap[u.uid]=count;
      }catch(e){}
    }));
    renderAdminUsers(allUsersCache,unreadMap);
    const ce=$('adminUserCount');if(ce)ce.textContent=allUsersCache.length+' members';
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load users</div></div>';}
}
function renderAdminUsers(users,unreadMap={}){
  const container=$('adminUserList');if(!container)return;
  if(users.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">No users found</div></div>';return;}
  container.innerHTML=users.map(u=>{
    const unread=unreadMap[u.uid]||0;
    return`
    <div class="admin-user-card" id="adminCard-${u.uid}">
      ${avatarHTML(u,'md')}
      <div class="admin-user-info">
        <div class="admin-user-name">${escapeHTML(u.displayName||'Member')} ${u.verified?'<span style="color:var(--accent);font-size:0.8rem">✓ Verified</span>':'<span style="color:var(--text-muted);font-size:0.8rem">Unverified</span>'}${unread>0?`<span style="background:var(--accent);color:#fff;font-size:0.7rem;padding:1px 7px;border-radius:9999px;margin-left:6px">${unread} unread msg${unread>1?'s':''}</span>`:''}</div>
        <div class="admin-user-meta">@${escapeHTML(u.handle||'?')} · ${escapeHTML(u.email||'')} · ${formatCount(u.followersCount||0)} followers</div>
      </div>
      <div class="admin-user-actions">
        <input class="admin-followers-input" id="flwInput-${u.uid}" type="number" value="${u.followersCount||0}" min="0" placeholder="Followers">
        <button class="btn btn-accent btn-sm" onclick="adminSetFollowers('${u.uid}')">Set</button>
        ${u.verified?`<button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="adminToggleVerify('${u.uid}',false)">Unverify</button>`:`<button class="btn btn-sm" style="background:var(--success);color:#fff" onclick="adminToggleVerify('${u.uid}',true)">Verify</button>`}
        <button class="btn btn-sm btn-danger" onclick="adminDeleteUser('${u.uid}')">Delete</button>
      </div>
    </div>`}).join('');
}
function adminSearchUsers(query){if(!query){renderAdminUsers(allUsersCache);return;}const q=query.toLowerCase();renderAdminUsers(allUsersCache.filter(u=>(u.displayName||'').toLowerCase().includes(q)||(u.handle||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)));}
async function adminSetFollowers(uid){const input=$('flwInput-'+uid);const val=parseInt(input.value);if(isNaN(val)||val<0)return showToast('Enter a valid number');try{await window.XF.update('users/'+uid,{followersCount:val});const u=allUsersCache.find(x=>x.uid===uid);if(u)u.followersCount=val;showToast('Followers updated!');}catch(err){showToast('Failed to update followers');}}
async function adminToggleVerify(uid,verify){try{await window.XF.update('users/'+uid,{verified:verify,...(verify?{verifiedAt:window.XF.ts()}:{verifiedAt:null})});const u=allUsersCache.find(x=>x.uid===uid);if(u)u.verified=verify;renderAdminUsers(allUsersCache);showToast(verify?'✓ User verified!':'User unverified');}catch(err){showToast('Failed to update verification');}}
async function adminDeleteUser(uid){
  if(!confirm('Delete this user and all their data? Cannot be undone.'))return;
  try{await window.XF.remove('users/'+uid);await window.XF.remove('notifications/'+uid);await window.XF.remove('connections/'+uid);allUsersCache=allUsersCache.filter(u=>u.uid!==uid);renderAdminUsers(allUsersCache);showToast('User deleted');}
  catch(err){showToast('Failed to delete user');}
}
async function loadAdminStats(){
  try{
    const us=await window.XF.get('users'),ps=await window.XF.get('posts');
    let total=0,verified=0,posts=0;
    if(us.exists())us.forEach(c=>{total++;if(c.val().verified)verified++;});
    if(ps.exists())ps.forEach(()=>posts++);
    $('statTotalUsers').textContent=total;$('statVerified').textContent=verified;$('statPosts').textContent=posts;
  }catch(err){}
}
async function loadScheduledPostsAdmin(){
  const statsTab=$('adminTabStats');if(!statsTab)return;
  if(!$('scheduledPostsList')){const s=document.createElement('div');s.style.cssText='margin-top:20px';s.innerHTML=`<div class="admin-section-title" style="margin-bottom:10px">◷ Scheduled Posts Queue</div><div id="scheduledPostsList"></div>`;statsTab.appendChild(s);}
  const container=$('scheduledPostsList');if(!container)return;
  container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">Loading…</div>';
  try{
    const snap=await window.XF.get('scheduledPosts');if(!snap.exists()){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">No scheduled posts</div>';return;}
    const all=Object.entries(snap.val()).filter(([,p])=>p.status==='scheduled');
    if(!all.length){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">No pending scheduled posts</div>';return;}
    all.sort(([,a],[,b])=>a.fireAt-b.fireAt);
    container.innerHTML=all.map(([key,p])=>`<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;font-size:0.83rem"><div style="font-weight:600;margin-bottom:4px">@${escapeHTML(p.handle||'?')} · <span style="color:var(--accent)">◷ ${new Date(p.fireAt).toLocaleString()}</span></div><div style="color:var(--text-dim);margin-bottom:6px">${escapeHTML(p.text)}</div><button class="btn btn-outline btn-sm" style="font-size:0.75rem;color:var(--danger)" onclick="cancelScheduled('${key}')">Cancel</button></div>`).join('');
  }catch(e){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">Could not load</div>';}
}
async function cancelScheduled(key){await window.XF.set('scheduledPosts/'+key+'/status','cancelled');showToast('Scheduled post cancelled');loadScheduledPostsAdmin();}
function injectAdminTools(){
  const adminContent=$('adminTabUsers');if(!adminContent||$('cePostBtn'))return;
  const keyPanel=document.createElement('div');
  keyPanel.style.cssText='margin-bottom:12px;padding:14px 16px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm)';
  keyPanel.innerHTML=`<div style="font-weight:700;font-size:0.93rem;margin-bottom:10px">⚙ Platform Keys</div>
    <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:4px;font-weight:600">AI — Groq Key</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input id="groqKeyInput" class="form-input" type="password" placeholder="Paste gsk_... key" style="flex:1;font-size:0.82rem" onfocus="if(this.value.startsWith('•'))this.value=''"><button class="btn btn-accent btn-sm" onclick="saveGroqKey()">Save</button></div>
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px">Free key from console.groq.com</div>
    <div style="font-size:0.78rem;color:var(--success);padding:8px;background:rgba(0,186,124,0.08);border-radius:6px;margin-bottom:4px">✓ Flutterwave key is hardcoded and active (FLWPUBK-9b3e...)</div>`;
  adminContent.insertBefore(keyPanel,adminContent.firstChild);
  const btn=document.createElement('div');
  btn.style.cssText='margin-bottom:12px;padding:14px 16px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;gap:12px';
  btn.innerHTML=`<div><div style="font-weight:700;font-size:0.93rem">◈ Claude Engineer</div><div style="font-size:0.78rem;color:var(--text-dim)">Post AI business insight to feed</div></div><button id="cePostBtn" class="btn btn-accent btn-sm" onclick="triggerClaudeEngineerPost()">Post Now</button>`;
  adminContent.insertBefore(btn,keyPanel.nextSibling);
  const countBadge=document.createElement('div');countBadge.id='adminUserCount';countBadge.style.cssText='font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;padding:0 2px';
  adminContent.insertBefore(countBadge,btn.nextSibling);
  window.XF.get('config/groqKey').then(s=>{if(s.exists()&&s.val()){const e=$('groqKeyInput');if(e)e.value='••••••••••••••••';}}).catch(()=>{});
  window.XF.get('config/flwKey').then(s=>{if(s.exists()&&s.val()){const e=$('flwKeyInput');if(e)e.value='••••••••••••••••';}}).catch(()=>{});
}
async function triggerClaudeEngineerPost(){const btn=$('cePostBtn');if(btn){btn.disabled=true;btn.textContent='Posting…';}await postClaudeEngineerToFeed();if(btn){btn.disabled=false;btn.textContent='Post Now';}showToast('[OK] Claude Engineer posted to feed!');}
async function saveGroqKey(){const input=$('groqKeyInput');if(!input)return;const val=input.value.trim();if(!val||val.startsWith('•')){showToast('Paste your Groq key first');return;}if(!val.startsWith('gsk_')){showToast('Invalid key — Groq keys start with gsk_');return;}try{await window.XF.set('config/groqKey',val);_groqKey=val;input.value='••••••••••••••••';showToast('[OK] Groq key saved');}catch(e){showToast('Failed to save key — check Firebase rules');}}
async function saveFlwKey(){const input=$('flwKeyInput');if(!input)return;const val=input.value.trim();if(!val||val.startsWith('•')){showToast('Paste your Flutterwave key first');return;}if(!val.startsWith('FLWPUBK')){showToast('Invalid key — must start with FLWPUBK');return;}try{await window.XF.set('config/flwKey',val);FLW_PUBLIC_KEY=val;input.value='••••••••••••••••';showToast(`[OK] Flutterwave ${val.includes('live')?'LIVE':'test'} key saved`);}catch(e){showToast('Failed to save key — check Firebase rules');}}

/* ══════════════════════════════════════════════
   DEEP LINK  (?post=ID)
══════════════════════════════════════════════ */
function checkDeepLink(){
  const params=new URLSearchParams(window.location.search);const postId=params.get('post');
  if(postId&&currentUser){window.history.replaceState({},'',window.location.pathname);setTimeout(()=>showPage('post-detail',{postId}),800);}
}

/* ══════════════════════════════════════════════
   RESET PASSWORD
══════════════════════════════════════════════ */
async function sendReset(){
  const email=$('resetEmail').value.trim();if(!email)return showToast('Enter your email');
  try{await window.XF.resetPw(email);showToast('Reset link sent — check your inbox');showPage('login');}
  catch(err){showToast('Could not send reset link');}
}

/* ══════════════════════════════════════════════
   THEME TOGGLE (dark ↔ light/gold)
══════════════════════════════════════════════ */
function toggleTheme(){
  const isLight=document.body.classList.toggle('theme-light');
  localStorage.setItem('xclub_theme',isLight?'light':'dark');
  ['themeToggleIcon','mobileThemeIcon'].forEach(id=>{const el=$(id);if(el)el.textContent=isLight?'🌙':'☀';});
}
function applyStoredTheme(){
  const t=localStorage.getItem('xclub_theme');
  if(t==='light'){
    document.body.classList.add('theme-light');
    ['themeToggleIcon','mobileThemeIcon'].forEach(id=>{const el=$(id);if(el)el.textContent='🌙';});
  }
}

/* ══════════════════════════════════════════════
   PHOTO LIGHTBOX
══════════════════════════════════════════════ */
function openLightbox(url){
  if(!url)return;
  const lb=document.createElement('div');lb.className='photo-lightbox';
  lb.innerHTML=`<div class="photo-lightbox-close" onclick="this.parentElement.remove()">✕</div><img src="${escapeHTML(url)}" alt="Photo">`;
  lb.onclick=function(e){if(e.target===lb)lb.remove();};
  document.body.appendChild(lb);
}

/* ══════════════════════════════════════════════
   SIDEBAR: hide Get Verified for verified members
══════════════════════════════════════════════ */
function updateSidebarVerifyBtn(){
  const btn=$('sidebarVerifyBtn');if(!btn)return;
  btn.style.display=(currentUser&&currentProfile?.verified)?'none':'block';
}

/* ══════════════════════════════════════════════
   PROFILE VIEWERS (TikTok-style)
══════════════════════════════════════════════ */
async function recordProfileView(profileUid){
  if(!currentUser||profileUid===currentUser.uid)return;
  try{
    await window.XF.set('profileViews/'+profileUid+'/'+currentUser.uid,{
      uid:currentUser.uid,
      displayName:currentProfile?.displayName||'Member',
      handle:currentProfile?.handle||'member',
      photoURL:currentProfile?.photoURL||'',
      viewedAt:window.XF.ts()
    });
  }catch(e){}
}
async function renderProfileViewers(profileUid,containerEl){
  if(!currentUser||profileUid!==currentUser.uid)return;
  try{
    const snap=await window.XF.get('profileViews/'+profileUid);
    if(!snap.exists())return;
    const viewers=[];snap.forEach(c=>viewers.push(c.val()));
    viewers.sort((a,b)=>(b.viewedAt||0)-(a.viewedAt||0));
    const recent=viewers.slice(0,5);
    if(recent.length===0)return;
    const strip=document.createElement('div');
    strip.className='profile-viewers-strip';
    strip.innerHTML=`
      <div class="profile-viewers-avatars">${recent.map(v=>avatarHTML(v,'sm')).join('')}</div>
      <div class="profile-viewers-label">${recent.length} recent viewer${recent.length>1?'s':''}</div>`;
    // Tap to expand panel
    let panelOpen=false;
    strip.onclick=function(e){
      e.stopPropagation();
      let panel=strip.querySelector('.profile-viewers-panel');
      if(panel){panel.remove();panelOpen=false;return;}
      panelOpen=true;
      panel=document.createElement('div');panel.className='profile-viewers-panel';
      panel.innerHTML=viewers.slice(0,10).map(v=>`
        <div class="profile-viewer-row" onclick="openUserProfile('${v.uid}',event)">
          ${avatarHTML(v,'sm')}
          <div>
            <div class="profile-viewer-name">${escapeHTML(v.displayName||'Member')}</div>
            <div class="profile-viewer-handle">@${escapeHTML(v.handle||'member')} · ${timeAgo(v.viewedAt)}</div>
          </div>
        </div>`).join('');
      strip.appendChild(panel);
      setTimeout(()=>document.addEventListener('click',function h(){panel.remove();document.removeEventListener('click',h);},{once:true}),50);
    };
    containerEl.insertBefore(strip,containerEl.firstChild);
  }catch(e){}
}

/* ══════════════════════════════════════════════
   CLICKABLE PROFILE PHOTO + BANNER
══════════════════════════════════════════════ */
function makeProfilePhotosClickable(containerEl,profile){
  // Banner
  const bannerEl=containerEl.querySelector('.profile-banner img');
  if(bannerEl){bannerEl.style.cursor='pointer';bannerEl.onclick=function(e){e.stopPropagation();openLightbox(profile.bannerURL);};}
  // Avatar
  const avatarEl=containerEl.querySelector('.profile-avatar-wrap img,.profile-avatar-wrap .avatar');
  if(avatarEl&&profile.photoURL){avatarEl.style.cursor='pointer';avatarEl.onclick=function(e){e.stopPropagation();openLightbox(profile.photoURL);};}
}

/* ══════════════════════════════════════════════
   ADMIN: edit post likes
══════════════════════════════════════════════ */
async function adminLoadPosts(){
  const container=$('adminPostList');if(!container)return;
  container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">Loading…</div>';
  try{
    const snap=await window.XF.get('posts');
    if(!snap.exists()){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">No posts</div>';return;}
    const posts=[];snap.forEach(c=>posts.push({id:c.key,...c.val()}));
    posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    container.innerHTML=posts.slice(0,30).map(p=>{
      const likeCount=p.likes?Object.keys(p.likes).length:0;
      return`<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;font-size:0.83rem">
        <div style="font-weight:600;margin-bottom:4px;color:var(--text-dim)">@${escapeHTML(p.handle||p.authorUid||'?')} · ${timeAgo(p.createdAt)}</div>
        <div style="margin-bottom:8px;color:var(--text)">${escapeHTML((p.text||'').slice(0,80))}${(p.text||'').length>80?'…':''}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--text-dim);font-size:0.8rem">❤ ${likeCount} likes</span>
          <input id="likeEdit-${p.id}" type="number" value="${likeCount}" min="0" style="width:70px;padding:4px 8px;background:var(--bg-3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:0.8rem;outline:none">
          <button class="btn btn-accent btn-sm" style="font-size:0.75rem;padding:4px 10px" onclick="adminSetLikes('${p.id}')">Set Likes</button>
        </div>
      </div>`;
    }).join('');
  }catch(e){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">Could not load posts</div>';}
}
async function adminSetLikes(postId){
  const input=$('likeEdit-'+postId);if(!input)return;
  const newCount=parseInt(input.value);if(isNaN(newCount)||newCount<0)return showToast('Enter a valid number');
  try{
    // Build a synthetic likes object with that many fake keys
    const snap=await window.XF.get('posts/'+postId+'/likes');
    const existing=snap.exists()?snap.val():{};
    const existingKeys=Object.keys(existing);
    // Add or remove synthetic like keys to reach target count
    const fakeBase='_fake_like_';
    // Remove all fake keys first
    const updates={};
    existingKeys.filter(k=>k.startsWith(fakeBase)).forEach(k=>updates['posts/'+postId+'/likes/'+k]=null);
    // Add new fake keys up to newCount minus real likes
    const realCount=existingKeys.filter(k=>!k.startsWith(fakeBase)).length;
    const toAdd=Math.max(0,newCount-realCount);
    for(let i=0;i<toAdd;i++)updates['posts/'+postId+'/likes/'+fakeBase+i]=true;
    await window.XF.multiUpdate(updates);
    showToast('Likes updated to '+newCount);
    adminLoadPosts();
  }catch(e){showToast('Failed to update likes');}
}

/* ══════════════════════════════════════════════
   PROFILE SHARING — deep link  (?user=HANDLE or ?uid=UID)
══════════════════════════════════════════════ */
function checkProfileDeepLink(){
  const params=new URLSearchParams(window.location.search);
  const handle=params.get('user');const uid=params.get('uid');
  if(!handle&&!uid)return false;
  window.history.replaceState({},'',window.location.pathname);
  (async()=>{
    try{
      let targetUid=uid;
      if(!targetUid&&handle){
        // Lookup uid by handle
        const snap=await window.XF.get('users');
        if(snap.exists())snap.forEach(c=>{if((c.val().handle||'').toLowerCase()===handle.toLowerCase())targetUid=c.key;});
      }
      if(!targetUid){showToast('Profile not found');return;}
      if(currentUser&&targetUid===currentUser.uid){showPage('profile');return;}
      showPage('user-profile',{uid:targetUid});
    }catch(e){showToast('Could not load profile');}
  })();
  return true;
}
function shareProfile(){
  if(!currentProfile)return;
  const handle=currentProfile.handle||currentUser?.uid;
  const url=window.location.origin+window.location.pathname+'?user='+encodeURIComponent(handle);
  if(navigator.share){
    navigator.share({title:currentProfile.displayName+' — X-Musk Financial Club',text:'Check out '+currentProfile.displayName+' on X-Musk Financial Club',url}).catch(()=>{});
  }else{
    navigator.clipboard?.writeText(url).then(()=>showToast('Profile link copied!')).catch(()=>showToast('Link: '+url));
  }
}
function shareUserProfile(uid,displayName,handle){
  const url=window.location.origin+window.location.pathname+'?user='+encodeURIComponent(handle||uid);
  if(navigator.share){
    navigator.share({title:(displayName||'Member')+' — X-Musk Financial Club',text:'Check out '+(displayName||'Member')+' on X-Musk Financial Club',url}).catch(()=>{});
  }else{
    navigator.clipboard?.writeText(url).then(()=>showToast('Profile link copied!')).catch(()=>showToast('Link: '+url));
  }
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',async()=>{
  applyStoredTheme();
  initLandingParticles();
  // Seed one history entry so the very first device back is intercepted by popstate
  // instead of leaving the PWA/tab entirely
  window.history.replaceState({page:'root'},'',window.location.pathname);
  // Safety net: if Firebase auth never fires within 8s, show the landing page
  const loaderFailsafe=setTimeout(()=>{hideLoader();showPage('landing');},8000);
  try{
    await window.XFire.load();
    window.XF.onAuth(user=>{clearTimeout(loaderFailsafe);onAuthChange(user);});
    setTimeout(loadBizFeed,3000);
  }catch(err){
    clearTimeout(loaderFailsafe);
    console.error('Firebase failed:',err);hideLoader();showPage('landing');
  }
});
