/* ═══════════════════════════════
   X-Musk Financial Club app.js v7
═══════════════════════════════ */
'use strict';

/* CONSTANTS */
const ADMIN_EMAIL='admin@gmail.com';
const CLAUDE_BOT_UID='claude_engineer_bot';
const MEMBERSHIP_PRICE=1999;
const MEMBERSHIP_CURRENCY='EUR';
let FLW_PUBLIC_KEY='FLWPUBK-9b3e74ad491f4e5e52d93bd09e3da203-X';

/* STATE */
let currentUser=null,currentProfile=null,activePage='landing',feedTab='for-you',notifTab='all',isAdmin=false,allUsersCache=[];
let chatPartnerUid=null,chatPartnerProfile=null,chatMsgListener=null,chatTypingListener=null;
let typingTimer=null,readDebounce=null,postTimingMode='now',selectedInvestAmt=0,feedListener=null,_groqKey=null;
const pageStack=[];
let suppressPopstate=false;

/* HELPERS */
const $=id=>document.getElementById(id);
function timeAgo(ts){if(!ts)return'';const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'s';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d';}
function formatCount(n){n=Number(n)||0;if(n>=1e9)return(n/1e9).toFixed(1).replace(/\.0$/,'')+'B';if(n>=1e6)return(n/1e6).toFixed(1).replace(/\.0$/,'')+'M';if(n>=1e3)return(n/1e3).toFixed(1).replace(/\.0$/,'')+'K';return String(n);}
function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const escapeHTML=esc;
function currSym(c){return{NGN:'₦',USD:'$',GBP:'£',EUR:'€',GHS:'₵',KES:'KSh',ZAR:'R',TZS:'TSh',UGX:'USh',RWF:'RF'}[c]||c||'€';}
function showToast(msg,dur=3000){const c=$('toastContainer');if(!c)return;const t=document.createElement('div');t.className='toast';t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},dur);}
function autoGrow(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function avatarHTML(p,sz='md'){const i=p?.displayName?p.displayName[0].toUpperCase():'?';if(p?.photoURL)return`<img class="avatar avatar-${sz}" src="${esc(p.photoURL)}" alt="" loading="lazy">`;return`<div class="avatar avatar-${sz}">${i}</div>`;}
function verifiedBadge(v,lg=false){if(!v)return'';return`<span class="badge-verified${lg?' lg':''}" title="Verified"><svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>`;}
function friendlyError(code){return({'auth/user-not-found':'No account with that email','auth/wrong-password':'Incorrect password','auth/invalid-credential':'Incorrect email or password','auth/email-already-in-use':'Email already registered','auth/weak-password':'Password too weak','auth/invalid-email':'Invalid email','auth/popup-closed-by-user':'Sign-in cancelled','auth/network-request-failed':'Network error'}[code])||'Something went wrong. Please try again.';}
function requireVerified(action){if(!currentUser){navigate('login');return false;}const open=['messages','dm','connect','follow','post','comment','event','reply'];if(open.includes(action))return true;if(!currentProfile?.verified){showPaywall();return false;}return true;}

/* PWA */
let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;const b=$('pwaInstallBtn');if(b)b.style.display='flex';});
window.addEventListener('appinstalled',()=>{deferredInstall=null;const b=$('pwaInstallBtn');if(b)b.style.display='none';showToast('App installed!');});
function triggerPWAInstall(){if(!deferredInstall){showToast('Open in browser to install');return;}deferredInstall.prompt();deferredInstall.userChoice.then(r=>{if(r.outcome==='accepted')showToast('Installing…');deferredInstall=null;});}

/* LOADER */
function hideLoader(){const l=$('appLoader');if(l){l.classList.add('gone');setTimeout(()=>l.remove(),600);}const a=$('app');if(a)a.classList.add('visible');}

/* THEME */
function toggleTheme(){const isLight=document.body.classList.toggle('light');localStorage.setItem('xclub_theme',isLight?'light':'dark');const lbl=$('themeLabel');if(lbl)lbl.textContent=isLight?'Dark mode':'Light mode';const fab=$('mobileThemeFab');if(fab)fab.textContent=isLight?'🌙':'☀';}
function applyStoredTheme(){if(localStorage.getItem('xclub_theme')==='light'){document.body.classList.add('light');const lbl=$('themeLabel');if(lbl)lbl.textContent='Dark mode';const fab=$('mobileThemeFab');if(fab)fab.textContent='🌙';}}

/* ROUTING */
function navigate(name,opts={}){
  if(name==='feed'&&!currentUser)name='landing';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=$('page-'+name);if(pg)pg.classList.add('active');
  activePage=name;syncNav();window.scrollTo(0,0);
  if(name!=='messages')closeChat();
  if(name==='feed')renderFeed();else teardownFeed();
  if(name==='discover')renderDiscover();
  if(name==='notifications')renderNotifications();
  if(name==='messages')renderConversations();
  if(name==='profile')renderOwnProfile();
  if(name==='user-profile')renderUserProfile(opts.uid);
  if(name==='post-detail')renderPostDetail(opts.postId);
  const noStack=['landing','login','register','reset'];
  if(!noStack.includes(name)){
    const top=pageStack[pageStack.length-1];
    const dupe=top&&top.name===name&&JSON.stringify(top.opts)===JSON.stringify(opts);
    if(!dupe){pageStack.push({name,opts});suppressPopstate=true;window.history.pushState({page:name,opts},'',window.location.pathname);suppressPopstate=false;}
  }
}
function goBack(){pageStack.pop();const prev=pageStack[pageStack.length-1];if(prev)navigate(prev.name,prev.opts||{});else navigate('feed');}
window.addEventListener('popstate',()=>{
  if(suppressPopstate)return;
  if($('chatPane')?.classList.contains('open')){closeChat();window.history.pushState({},'',window.location.pathname);return;}
  goBack();window.history.pushState({},'',window.location.pathname);
});
function syncNav(){document.querySelectorAll('.nav-item,.mobile-nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===activePage));}

/* AUTH */
async function handleLogin(e){
  e.preventDefault();const email=$('loginEmail').value.trim(),pass=$('loginPass').value;
  if(!email||!pass)return showToast('Fill in all fields');
  const btn=$('loginBtn');btn.disabled=true;btn.textContent='Signing in…';
  try{await window.XF.signIn(email,pass);}catch(err){showToast(friendlyError(err.code));btn.disabled=false;btn.textContent='Sign in';}
}
async function handleRegister(e){
  e.preventDefault();
  const name=$('regName').value.trim();
  const handle=$('regHandle').value.trim().replace('@','').toLowerCase().replace(/[^a-z0-9_]/g,'');
  const email=$('regEmail').value.trim(),pass=$('regPass').value;
  const btn=$('regBtn');
  if(!name||!email||!pass||!handle)return showToast('Fill in all fields');
  if(pass.length<8)return showToast('Password must be at least 8 characters');
  if(handle.length<3)return showToast('Handle must be at least 3 characters');
  btn.disabled=true;btn.textContent='Creating…';
  try{
    const hSnap=await window.XF.get('handles/'+handle);
    if(hSnap.exists()){showToast('@'+handle+' is taken');btn.disabled=false;btn.textContent='Create account';return;}
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
      const hSnap=await window.XF.get('handles/'+handle);if(hSnap.exists())handle+=Math.floor(Math.random()*9000+1000);
      await window.XF.set('users/'+cred.user.uid,{uid:cred.user.uid,displayName:cred.user.displayName||'Member',handle,email:cred.user.email||'',bio:'',photoURL:cred.user.photoURL||'',verified:false,followersCount:0,followingCount:0,postsCount:0,joinedAt:window.XF.ts()});
      await window.XF.set('handles/'+handle,cred.user.uid);
    }
  }catch(err){showToast(friendlyError(err.code));}
}
async function handleLogout(){await window.XF.signOut();currentUser=null;currentProfile=null;pageStack.length=0;navigate('landing');}
async function sendReset(){const email=$('resetEmail').value.trim();if(!email)return showToast('Enter your email');try{await window.XF.resetPw(email);showToast('Reset link sent!');navigate('login');}catch(err){showToast('Could not send reset link');}}

async function onAuthChange(user){
  currentUser=user;
  if(user){
    if(user.email===ADMIN_EMAIL){isAdmin=true;const s=await window.XF.get('users/'+user.uid);currentProfile=s.exists()?s.val():{displayName:'Admin',uid:user.uid};hideLoader();navigate('admin');loadAdminUsers();setTimeout(injectAdminTools,500);return;}
    isAdmin=false;const snap=await window.XF.get('users/'+user.uid);currentProfile=snap.exists()?snap.val():null;
    updateNavUser();updateComposerAvatar();startNotifWatcher();startMsgWatcher();loadSuggestedMembers();updateSidebarVerifyPanel();
    const handled=checkDeepLinks();
    if(!handled){if(['landing','login','register'].includes(activePage))navigate('feed');else navigate(activePage);}
    setTimeout(loadBizFeed,1500);setTimeout(runScheduledPosts,5000);
  }else{isAdmin=false;currentProfile=null;updateNavUser();updateSidebarVerifyPanel();if(!checkDeepLinks())navigate('landing');}
  hideLoader();
}
function updateNavUser(){
  const wrap=$('navUserWrap');if(!wrap)return;
  if(currentUser&&currentProfile){
    wrap.style.display='flex';
    const n=$('navUserName'),h=$('navUserHandle'),a=$('navUserAvatar');
    if(n)n.innerHTML=esc(currentProfile.displayName||'Member')+verifiedBadge(currentProfile.verified);
    if(h)h.textContent='@'+(currentProfile.handle||'member');
    if(a){if(currentProfile.photoURL)a.outerHTML=`<img id="navUserAvatar" class="avatar avatar-md" src="${esc(currentProfile.photoURL)}" alt="">`;else a.textContent=(currentProfile.displayName||'?')[0].toUpperCase();}
  }else wrap.style.display='none';
}
function updateComposerAvatar(){const el=$('composerAvatar');if(!el||!currentProfile)return;if(currentProfile.photoURL)el.outerHTML=`<img id="composerAvatar" class="avatar avatar-md" src="${esc(currentProfile.photoURL)}" alt="">`;else el.textContent=(currentProfile.displayName||'?')[0].toUpperCase();}
function updateSidebarVerifyPanel(){const w=$('sidebarVerifyWrap');if(!w)return;w.style.display=(currentUser&&!currentProfile?.verified)?'block':'none';}

/* DEEP LINKS */
function checkDeepLinks(){
  const p=new URLSearchParams(window.location.search);const postId=p.get('post'),handle=p.get('user'),uid=p.get('uid');
  if(!postId&&!handle&&!uid)return false;
  window.history.replaceState({},'',window.location.pathname);
  setTimeout(async()=>{
    if(postId&&currentUser){navigate('post-detail',{postId});return;}
    if(handle||uid){let t=uid;if(!t&&handle){const s=await window.XF.get('users');if(s.exists())s.forEach(c=>{if((c.val().handle||'').toLowerCase()===handle.toLowerCase())t=c.key;});}
    if(!t){showToast('Profile not found');return;}if(currentUser&&t===currentUser.uid){navigate('profile');return;}navigate('user-profile',{uid:t});}
  },600);return true;
}

/* PAYWALL */
function showPaywall(){$('paywallModal').classList.add('open');}
function closePaywall(){$('paywallModal').classList.remove('open');}
function initiatePayment(){
  if(!currentUser||!currentProfile){showToast('Sign in first');return;}
  if(typeof FlutterwaveCheckout==='undefined'){showToast('Payment loading — try again');return;}
  FlutterwaveCheckout({public_key:FLW_PUBLIC_KEY,tx_ref:'XCLUB-'+currentUser.uid+'-'+Date.now(),amount:MEMBERSHIP_PRICE,currency:MEMBERSHIP_CURRENCY,payment_options:'card,banktransfer,ussd',customer:{email:currentUser.email,name:currentProfile.displayName||'Member'},customizations:{title:'X Club Membership',description:'Annual verified membership',logo:''},
    callback:async function(data){if(data.status==='successful'||data.status==='completed'){try{await window.XF.update('users/'+currentUser.uid,{verified:true,verifiedAt:window.XF.ts(),paymentRef:data.transaction_id||data.tx_ref});currentProfile.verified=true;closePaywall();showToast('✦ You are now a verified member!');updateNavUser();renderOwnProfile();updateSidebarVerifyPanel();}catch(err){showToast('Payment confirmed but update failed');}}else showToast('Payment was not completed');},onclose:function(){}});
}

/* FEED */
function teardownFeed(){if(feedListener){try{feedListener();}catch(e){}feedListener=null;}}
function renderFeed(){
  const container=$('feedPosts');if(!container)return;teardownFeed();container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  feedListener=window.XF.on('posts',async snap=>{
    try{
      const blocked=await getBlockedUids();let connUids=[];
      if(feedTab==='following'&&currentUser){const cs=await window.XF.get('connections/'+currentUser.uid);connUids=cs.exists()?Object.keys(cs.val()):[];}
      let posts=[];if(snap.exists())snap.forEach(c=>posts.push({id:c.key,...c.val()}));
      posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      if(blocked.size>0)posts=posts.filter(p=>!blocked.has(p.authorUid));
      if(feedTab==='following'&&currentUser){posts=posts.filter(p=>connUids.includes(p.authorUid)||p.authorUid===CLAUDE_BOT_UID);if(posts.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">◪</div><div class="empty-state-title">Nothing from connections yet</div><div class="empty-state-desc">Connect with members to see their posts</div></div>';return;}}
      if(posts.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">◪</div><div class="empty-state-title">Nothing here yet</div><div class="empty-state-desc">Be the first to post</div></div>';return;}
      await renderPostList(posts,container);
    }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load posts</div></div>';}
  });
}
async function renderPostList(posts,container){
  const uids=[...new Set(posts.map(p=>p.authorUid).filter(u=>u&&u!==CLAUDE_BOT_UID))];const profiles={};
  await Promise.allSettled(uids.map(async uid=>{try{const s=await window.XF.get('users/'+uid);if(s.exists())profiles[uid]=s.val();}catch(e){}}));
  container.innerHTML=posts.map(p=>{if(p.type==='business')return bizPostHTML(p,profiles[p.authorUid]);if(p.authorUid===CLAUDE_BOT_UID)return botPostHTML(p);return postHTML(p,profiles[p.authorUid]);}).join('');
}
function switchFeedTab(tab,el){feedTab=tab;document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderFeed();}

/* POST HTML */
function postHTML(post,author){
  const isLiked=currentUser&&post.likes&&post.likes[currentUser.uid];
  const likes=post.likes?Object.keys(post.likes).length:0;
  const comments=post.commentCount||0;
  const isOwner=currentUser&&post.authorUid===currentUser.uid;
  let media='';
  if(post.imageURL)media=`<img class="post-image" src="${esc(post.imageURL)}" alt="" loading="lazy">`;
  if(post.type==='event'){media+=`<div class="post-event-card"><span class="post-event-badge ${post.eventPrivate?'private':'open'}">${post.eventPrivate?'⊘ Private':'◯ Open Event'}</span><div class="post-event-title">${esc(post.eventTitle||'')}</div><div class="post-event-meta">${post.eventDate?`<span>📅 ${post.eventDate}</span>`:''}${post.eventTime?`<span>🕐 ${post.eventTime}</span>`:''}${post.eventLocation?`<span>📍 ${esc(post.eventLocation)}</span>`:''}</div><button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="event.stopPropagation();rsvpEvent('${post.id}')">RSVP</button></div>`;}
  return`<div class="post" data-id="${post.id}" onclick="openPost('${post.id}',event)">
    <div onclick="event.stopPropagation();openUserProfile('${post.authorUid}',event)">${avatarHTML(author,'md')}</div>
    <div class="post-body">
      <div class="post-header">
        <span class="post-name">${esc(author?.displayName||'Unknown')}</span>${verifiedBadge(author?.verified)}
        <span class="post-handle">@${esc(author?.handle||'unknown')}</span>
        <span class="post-time">· ${timeAgo(post.createdAt)}</span>
        ${isOwner?`<span class="post-delete" onclick="event.stopPropagation();deletePost('${post.id}')">✕</span>`:''}
      </div>
      <div class="post-text">${esc(post.text||'')}</div>
      ${media}
      <div class="post-actions" onclick="event.stopPropagation()">
        <div class="post-action comment" onclick="openPost('${post.id}',event)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${comments>0?' '+formatCount(comments):''}</div>
        <div class="post-action like${isLiked?' liked':''}" onclick="toggleLike('${post.id}',this)"><svg width="17" height="17" viewBox="0 0 24 24" fill="${isLiked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likes>0?' '+formatCount(likes):''}</div>
        <div class="post-action share" onclick="sharePost('${post.id}')"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      </div>
    </div>
  </div>`;
}
function botPostHTML(post){
  const isLiked=currentUser&&post.likes&&post.likes[currentUser.uid];const likes=post.likes?Object.keys(post.likes).length:0;const comments=post.commentCount||0;
  return`<div class="post" data-id="${post.id}" onclick="openPost('${post.id}',event)">
    <div class="avatar avatar-md" style="background:#111;border:1px solid #333;font-size:0.7rem;color:var(--accent)">CE</div>
    <div class="post-body">
      <div class="post-header"><span class="post-name">Claude Engineer</span>${verifiedBadge(true)}<span class="post-handle">@claudeengineer</span><span class="post-time">· ${timeAgo(post.createdAt)}</span></div>
      <div class="post-text">${esc(post.text||'')}</div>
      <div class="post-actions" onclick="event.stopPropagation()">
        <div class="post-action comment" onclick="openPost('${post.id}',event)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${comments>0?' '+formatCount(comments):''}</div>
        <div class="post-action like${isLiked?' liked':''}" onclick="toggleLike('${post.id}',this)"><svg width="17" height="17" viewBox="0 0 24 24" fill="${isLiked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likes>0?' '+formatCount(likes):''}</div>
        <div class="post-action share" onclick="sharePost('${post.id}')"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      </div>
    </div>
  </div>`;
}
function bizPostHTML(post,author){
  const isOwner=currentUser&&post.authorUid===currentUser.uid;
  const raised=post.bizRaised||0,target=post.bizTarget||1,pct=Math.min(100,Math.round((raised/target)*100));
  const isLiked=currentUser&&post.likes&&post.likes[currentUser.uid];const likes=post.likes?Object.keys(post.likes).length:0;const sym=currSym(post.bizCurrency);
  return`<div class="post" data-id="${post.id}">
    <div onclick="openUserProfile('${post.authorUid}',event)">${avatarHTML(author,'md')}</div>
    <div class="post-body">
      <div class="post-header">
        <span class="post-name">${esc(author?.displayName||'Unknown')}</span>${verifiedBadge(author?.verified)}
        <span class="post-handle">@${esc(author?.handle||'unknown')}</span><span class="post-time">· ${timeAgo(post.createdAt)}</span>
        ${isOwner?`<span class="post-delete" onclick="event.stopPropagation();deletePost('${post.id}')">✕</span>`:''}
      </div>
      <div class="post-text">${esc(post.text||'')}</div>
      <div class="post-invest-card">
        <div class="invest-badge">▣ INVESTMENT${post.bizSector?' · '+esc(post.bizSector):''}</div>
        <div class="invest-title">${esc(post.bizTitle||'')}</div>
        <div class="invest-target">Target: ${sym}${Number(target).toLocaleString()} ${post.bizCurrency||'EUR'}</div>
        <div class="invest-progress-track"><div class="invest-progress-fill" style="width:${pct}%"></div></div>
        <div class="invest-stats"><span>${pct}% funded</span><span>${post.investorCount||0} investors</span></div>
        <div class="invest-raised">${sym}${Number(raised).toLocaleString()} raised</div>
        <div style="margin-top:10px">
          ${!isOwner?`<button class="invest-now-btn" onclick="event.stopPropagation();openInvestModal('${post.id}')">◈ Invest Now</button>`:''}
          ${isOwner?`<button class="invest-manage-btn" onclick="event.stopPropagation();openManageInvest('${post.id}')">⊞ Manage</button>`:''}
        </div>
      </div>
      <div class="post-actions" onclick="event.stopPropagation()">
        <div class="post-action like${isLiked?' liked':''}" onclick="toggleLike('${post.id}',this)"><svg width="17" height="17" viewBox="0 0 24 24" fill="${isLiked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likes>0?' '+formatCount(likes):''}</div>
        <div class="post-action share" onclick="sharePost('${post.id}')"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      </div>
    </div>
  </div>`;
}

/* POST COMPOSE */
function switchPostType(type){['post','event','business'].forEach(t=>{const b=$('pt'+t[0].toUpperCase()+t.slice(1));if(b)b.classList.toggle('active',t===type);});const ef=$('eventFields'),bf=$('bizFields');if(ef)ef.classList.toggle('open',type==='event');if(bf)bf.classList.toggle('open',type==='business');}
function setTiming(mode){postTimingMode=mode;const map={now:'timingNow',backdate:'timingBack',schedule:'timingSchedule'};Object.entries(map).forEach(([m,id])=>{const b=$(id);if(b)b.classList.toggle('active',m===mode);});const row=$('timingDateRow'),hint=$('timingHint'),inp=$('postCustomDate');if(row)row.style.display=mode==='now'?'none':'block';if(inp){if(mode==='backdate'){inp.max=new Date().toISOString().slice(0,16);inp.removeAttribute('min');if(hint)hint.textContent='Post will appear with this date';}else if(mode==='schedule'){inp.min=new Date().toISOString().slice(0,16);inp.removeAttribute('max');if(hint)hint.textContent='Post goes live at this time';}}}
function resolvePostTS(){const inp=$('postCustomDate');if(!inp||!inp.value)return Date.now();const ts=new Date(inp.value).getTime();return isNaN(ts)?Date.now():ts;}

async function submitPost(){
  if(!requireVerified('post'))return;
  const isBiz=$('ptBusiness')?.classList.contains('active'),isEvt=$('ptEvent')?.classList.contains('active');
  if(isBiz){await _submitBizPost();return;}
  if(postTimingMode==='schedule'){const ts=resolvePostTS();if(ts<=Date.now()){showToast('Pick a future time');return;}await _saveScheduled(ts);return;}
  const textarea=$('postText'),text=textarea.value.trim(),imgInput=$('postImgInput');
  if(!text&&!imgInput?.files[0])return showToast('Write something first');
  const btn=$('postSubmitBtn');btn.disabled=true;btn.textContent='Posting…';
  try{
    let imageURL='';if(imgInput?.files[0]){showToast('Uploading…');imageURL=(await window.XCloud.upload(imgInput.files[0],'x_posts')).url;}
    const ts=postTimingMode==='backdate'?resolvePostTS():Date.now();
    const data={authorUid:currentUser.uid,text,imageURL,type:isEvt?'event':'post',createdAt:ts,commentCount:0};
    if(isEvt){data.eventTitle=$('eventTitle').value.trim();data.eventDate=$('eventDate').value;data.eventTime=$('eventTime').value;data.eventLocation=$('eventLocation').value.trim();data.eventPrivate=$('eventPrivate').checked;data.rsvps={};}
    await window.XF.push('posts',data);
    await window.XF.update('users/'+currentUser.uid,{postsCount:(currentProfile.postsCount||0)+1});currentProfile.postsCount=(currentProfile.postsCount||0)+1;
    textarea.value='';textarea.style.height='auto';if(imgInput)imgInput.value='';$('postImgPreview').innerHTML='';switchPostType('post');setTiming('now');showToast('Posted!');renderFeed();
  }catch(err){showToast('Failed to post');}finally{btn.disabled=false;btn.textContent='Post';}
}
async function _submitBizPost(){
  const text=$('postText').value.trim(),title=$('bizTitle').value.trim(),target=parseFloat($('bizTarget').value);
  if(!text)return showToast('Describe your opportunity');if(!title)return showToast('Enter a title');if(!target||target<=0)return showToast('Enter a valid target');
  const btn=$('postSubmitBtn');btn.disabled=true;btn.textContent='Posting…';
  try{
    await window.XF.push('posts',{authorUid:currentUser.uid,text,type:'business',bizTitle:title,bizTarget:target,bizSector:$('bizSector').value.trim(),bizCurrency:$('bizCurrency')?.value||'EUR',bizEmail:$('bizEmail')?.value.trim()||'',bizRaised:0,investorCount:0,createdAt:Date.now(),commentCount:0});
    await window.XF.update('users/'+currentUser.uid,{postsCount:(currentProfile.postsCount||0)+1});currentProfile.postsCount=(currentProfile.postsCount||0)+1;
    $('postText').value='';$('bizTitle').value='';$('bizTarget').value='';$('bizSector').value='';if($('bizEmail'))$('bizEmail').value='';
    switchPostType('post');showToast('Business post published!');renderFeed();
  }catch(err){showToast('Failed to post');}finally{btn.disabled=false;btn.textContent='Post';}
}
async function _saveScheduled(fireAt){if(!currentUser)return;const text=$('postText')?.value.trim();if(!text){showToast('Write something first');return;}await window.XF.push('scheduledPosts',{text,uid:currentUser.uid,displayName:currentProfile.displayName,handle:currentProfile.handle||'',photoURL:currentProfile.photoURL||null,verified:currentProfile.verified||false,fireAt,createdAt:Date.now(),status:'scheduled'});if($('postText'))$('postText').value='';setTiming('now');showToast('Post scheduled for '+new Date(fireAt).toLocaleString());}
async function runScheduledPosts(){if(!currentUser)return;try{const snap=await window.XF.get('scheduledPosts');if(!snap.exists())return;const now=Date.now();for(const[key,post]of Object.entries(snap.val())){if(post.status==='scheduled'&&post.fireAt<=now&&post.uid===currentUser.uid){await window.XF.push('posts',{authorUid:post.uid,text:post.text,type:'post',createdAt:post.fireAt,commentCount:0});await window.XF.set('scheduledPosts/'+key+'/status','published');showToast('Scheduled post published!');}}}catch(e){}}
setInterval(runScheduledPosts,60_000);

async function deletePost(id){if(!confirm('Delete this post?'))return;try{await window.XF.remove('posts/'+id);await window.XF.remove('comments/'+id);if(currentProfile){await window.XF.update('users/'+currentUser.uid,{postsCount:Math.max(0,(currentProfile.postsCount||1)-1)});currentProfile.postsCount=Math.max(0,(currentProfile.postsCount||1)-1);}showToast('Post deleted');renderFeed();}catch(e){showToast('Could not delete post');}}
function previewPostImg(input){const preview=$('postImgPreview');if(!input.files?.[0]||!preview)return;const r=new FileReader();r.onload=e=>{preview.innerHTML=`<div class="img-preview-wrap"><img src="${e.target.result}"><div class="img-preview-remove" onclick="removePostImg()">✕</div></div>`;};r.readAsDataURL(input.files[0]);}
function removePostImg(){$('postImgInput').value='';$('postImgPreview').innerHTML='';}

async function toggleLike(postId,el){
  if(!currentUser){navigate('login');return;}
  const uid=currentUser.uid,snap=await window.XF.get('posts/'+postId+'/likes/'+uid);
  const hsvg=f=>`<svg width="17" height="17" viewBox="0 0 24 24" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  const pc=txt=>{const s=(txt||'').trim().replace(/[^0-9.KMBkmb]/g,'');if(!s)return 0;if(/k/i.test(s))return Math.round(parseFloat(s)*1000);if(/m/i.test(s))return Math.round(parseFloat(s)*1e6);return parseInt(s)||0;};
  if(snap.exists()){await window.XF.remove('posts/'+postId+'/likes/'+uid);el.classList.remove('liked');const c=Math.max(0,pc(el.textContent)-1);el.innerHTML=hsvg(false)+(c>0?' '+formatCount(c):'');}
  else{
    await window.XF.set('posts/'+postId+'/likes/'+uid,true);el.classList.add('liked');const c=pc(el.textContent)+1;el.innerHTML=hsvg(true)+' '+formatCount(c);
    const ps=await window.XF.get('posts/'+postId);if(ps.exists()){const pv=ps.val();if(pv.authorUid&&pv.authorUid!==uid&&pv.authorUid!==CLAUDE_BOT_UID)await pushNotif(pv.authorUid,{type:'like',fromUid:uid,fromName:currentProfile?.displayName||'Member',postId,createdAt:window.XF.ts(),read:false});}
  }
}
async function rsvpEvent(postId){if(!currentUser){navigate('login');return;}const uid=currentUser.uid,snap=await window.XF.get('posts/'+postId+'/rsvps/'+uid);if(snap.exists()){await window.XF.remove('posts/'+postId+'/rsvps/'+uid);showToast('RSVP removed');}else{await window.XF.set('posts/'+postId+'/rsvps/'+uid,{name:currentProfile?.displayName||'Member',at:window.XF.ts()});showToast('RSVP confirmed!');}}
function sharePost(postId){const url=window.location.origin+window.location.pathname+'?post='+postId;if(navigator.clipboard)navigator.clipboard.writeText(url);showToast('Link copied!');}
async function openPost(postId,e){if(e)e.stopPropagation();if(!currentUser){navigate('login');return;}navigate('post-detail',{postId});}
function openPostModal(){if(!requireVerified('post'))return;$('newPostModal').classList.add('open');}
async function submitModalPost(){const ta=$('modalPostText');const text=ta.value.trim();if(!text)return showToast('Write something first');if(!requireVerified('post'))return;const btn=document.querySelector('#newPostModal .composer-submit');btn.disabled=true;btn.textContent='Posting…';try{await window.XF.push('posts',{authorUid:currentUser.uid,text,type:'post',createdAt:Date.now(),commentCount:0});ta.value='';closeModal('newPostModal');showToast('Posted!');if(activePage==='feed')renderFeed();}catch(e){showToast('Failed');}finally{btn.disabled=false;btn.textContent='Post';}}

/* POST DETAIL */
async function renderPostDetail(postId){
  const container=$('postDetailContent');if(!container||!postId)return;container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const snap=await window.XF.get('posts/'+postId);if(!snap.exists()){container.innerHTML='<div class="empty-state"><div class="empty-state-title">Post not found</div></div>';return;}
    const post={id:postId,...snap.val()};let author=null;
    if(post.authorUid===CLAUDE_BOT_UID){author={displayName:'Claude Engineer',handle:'claudeengineer',verified:true,photoURL:''};}
    else{const as=await window.XF.get('users/'+post.authorUid);author=as.exists()?as.val():null;}
    const card=post.authorUid===CLAUDE_BOT_UID?botPostHTML(post):postHTML(post,author);
    const staticCard=card.replace(/onclick="openPost\('[^']*',event\)"/g,'');
    container.innerHTML=`<div style="border-bottom:1px solid var(--border)">${staticCard}</div><div id="commentsArea"></div><div class="post-reply-bar">${avatarHTML(currentProfile,'sm')}<input id="commentInput" class="comment-input" placeholder="Post your reply" onkeydown="if(event.key==='Enter')submitComment('${postId}')"><button class="btn btn-accent btn-sm" onclick="submitComment('${postId}')">Reply</button></div>`;
    loadComments(postId);
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load post</div></div>';}
}
async function loadComments(postId){
  const area=$('commentsArea');if(!area)return;area.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const snap=await window.XF.get('comments/'+postId);const comments=[];if(snap.exists())snap.forEach(c=>comments.push({id:c.key,...c.val()}));
  comments.sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  if(comments.length===0){area.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:0.88rem">No replies yet — be first!</div>';return;}
  const uids=[...new Set(comments.map(c=>c.authorUid))];const profiles={};
  await Promise.all(uids.map(async uid=>{const s=await window.XF.get('users/'+uid);if(s.exists())profiles[uid]=s.val();}));
  area.innerHTML=comments.map(c=>{const a=profiles[c.authorUid];const isOwner=currentUser&&c.authorUid===currentUser.uid;return`<div class="comment">${avatarHTML(a,'sm')}<div class="comment-body"><div class="comment-header"><span class="comment-name">${esc(a?.displayName||'Unknown')}</span>${verifiedBadge(a?.verified)}<span class="comment-time">${timeAgo(c.createdAt)}</span>${isOwner?`<span onclick="deleteComment('${postId}','${c.id}')" style="margin-left:auto;cursor:pointer;color:var(--text-muted);font-size:0.76rem">✕</span>`:''}</div><div class="comment-text">${esc(c.text||'')}</div></div></div>`;}).join('');
}
async function submitComment(postId){
  if(!requireVerified('comment'))return;const input=$('commentInput');const text=input.value.trim();if(!text)return;input.value='';
  await window.XF.push('comments/'+postId,{authorUid:currentUser.uid,text,createdAt:window.XF.ts()});
  const csnap=await window.XF.get('posts/'+postId+'/commentCount');await window.XF.set('posts/'+postId+'/commentCount',(csnap.val()||0)+1);
  const ps=await window.XF.get('posts/'+postId);if(ps.exists()){const pv=ps.val();if(pv.authorUid&&pv.authorUid!==currentUser.uid&&pv.authorUid!==CLAUDE_BOT_UID)await pushNotif(pv.authorUid,{type:'comment',fromUid:currentUser.uid,fromName:currentProfile?.displayName||'Member',postId,preview:text.slice(0,40),createdAt:window.XF.ts(),read:false});}
  loadComments(postId);
}
async function deleteComment(postId,cId){try{await window.XF.remove('comments/'+postId+'/'+cId);const s=await window.XF.get('posts/'+postId+'/commentCount');await window.XF.set('posts/'+postId+'/commentCount',Math.max(0,(s.val()||1)-1));loadComments(postId);}catch(e){showToast('Could not delete comment');}}

/* DISCOVER */
async function renderDiscover(){
  const container=$('discoverPeople');if(!container)return;container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const snap=await window.XF.get('users');const people=[];const blocked=await getBlockedUids();
    if(snap.exists())snap.forEach(c=>{if(c.key!==currentUser?.uid&&!blocked.has(c.key))people.push(c.val());});
    if(people.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-title">No members yet</div></div>';return;}
    const myConns={};if(currentUser){const cs=await window.XF.get('connections/'+currentUser.uid);if(cs.exists())Object.assign(myConns,cs.val());}
    const reqSnap=currentUser?await window.XF.get('connectionRequests'):null;
    container.innerHTML=people.map(p=>{
      const isConn=!!myConns[p.uid];const isPending=!isConn&&reqSnap?.exists()&&reqSnap.val()[`${currentUser?.uid}_${p.uid}`]?.status==='pending';const status=isConn?'connected':isPending?'pending':'none';
      return`<div class="people-card" onclick="openUserProfile('${p.uid}',event)">${avatarHTML(p,'md')}<div class="people-card-info"><div class="people-card-name">${esc(p.displayName||'Member')}${verifiedBadge(p.verified)}</div><div class="people-card-handle">@${esc(p.handle||'member')}</div>${p.bio?`<div class="people-card-bio">${esc(p.bio)}</div>`:''}</div><div onclick="event.stopPropagation()">${connectBtnHTML(p.uid,status)}</div></div>`;
    }).join('');
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load members</div></div>';}
}
function connectBtnHTML(uid,status){if(!currentUser||uid===currentUser.uid)return'';if(status==='connected')return`<button class="btn btn-connected btn-sm" onclick="event.stopPropagation();disconnectUser('${uid}')">Connected</button>`;if(status==='pending')return`<button class="btn btn-outline btn-sm" disabled>Pending…</button>`;return`<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendConnReq('${uid}')">Connect</button>`;}
async function sendConnReq(toUid){if(!requireVerified('connect'))return;const reqId=currentUser.uid+'_'+toUid;await window.XF.set('connectionRequests/'+reqId,{from:currentUser.uid,to:toUid,status:'pending',createdAt:window.XF.ts()});await pushNotif(toUid,{type:'connection_request',fromUid:currentUser.uid,fromName:currentProfile.displayName,reqId,createdAt:window.XF.ts(),read:false});showToast('Connection request sent!');renderDiscover();}
async function acceptConn(reqId,fromUid){
  const myUid=currentUser.uid;await window.XF.update('connectionRequests/'+reqId,{status:'accepted'});
  await window.XF.set('connections/'+myUid+'/'+fromUid,true);await window.XF.set('connections/'+fromUid+'/'+myUid,true);
  const myF=(await window.XF.get('users/'+myUid+'/followersCount')).val()||0,thF=(await window.XF.get('users/'+fromUid+'/followersCount')).val()||0;
  const myFw=(await window.XF.get('users/'+myUid+'/followingCount')).val()||0;
  await window.XF.update('users/'+myUid,{followersCount:myF+1,followingCount:myFw+1});await window.XF.update('users/'+fromUid,{followersCount:thF+1,followingCount:(await window.XF.get('users/'+fromUid+'/followingCount')).val()||0+1});
  if(currentProfile){currentProfile.followersCount=myF+1;currentProfile.followingCount=myFw+1;}
  await pushNotif(fromUid,{type:'connection_accepted',fromUid:myUid,fromName:currentProfile?.displayName||'Member',createdAt:window.XF.ts(),read:false});
  showToast('Connection accepted!');renderNotifications();
}
async function declineConn(reqId){await window.XF.update('connectionRequests/'+reqId,{status:'declined'});showToast('Request declined');renderNotifications();}
async function handleAcceptConn(reqId,fromUid,btn){const c=btn?.closest('[id^="connBtns_"]');if(c)c.innerHTML='<span style="color:var(--success);font-size:0.82rem;font-weight:600">✓ Connected</span>';await acceptConn(reqId,fromUid);}
async function disconnectUser(uid){if(!currentUser)return;await window.XF.remove('connections/'+currentUser.uid+'/'+uid);await window.XF.remove('connections/'+uid+'/'+currentUser.uid);const myF=(await window.XF.get('users/'+currentUser.uid+'/followersCount')).val()||0,myFw=(await window.XF.get('users/'+currentUser.uid+'/followingCount')).val()||0;await window.XF.update('users/'+currentUser.uid,{followersCount:Math.max(0,myF-1),followingCount:Math.max(0,myFw-1)});if(currentProfile){currentProfile.followersCount=Math.max(0,myF-1);currentProfile.followingCount=Math.max(0,myFw-1);}showToast('Disconnected');renderDiscover();}

/* BLOCK */
async function blockUser(uid,name){if(!currentUser||uid===currentUser.uid)return;if(!confirm('Block '+name+'?'))return;try{await window.XF.set('blocks/'+currentUser.uid+'/'+uid,{blockedAt:window.XF.ts(),displayName:name||''});await window.XF.remove('connections/'+currentUser.uid+'/'+uid);await window.XF.remove('connections/'+uid+'/'+currentUser.uid);showToast('User blocked');goBack();}catch(e){showToast('Could not block user');}}
async function unblockUser(uid,name){try{await window.XF.remove('blocks/'+currentUser.uid+'/'+uid);showToast(name+' unblocked');}catch(e){showToast('Could not unblock');}}
async function getBlockedUids(){if(!currentUser)return new Set();try{const s=await window.XF.get('blocks/'+currentUser.uid);return s.exists()?new Set(Object.keys(s.val())):new Set();}catch(e){return new Set();}}
async function isBlocked(uid){if(!currentUser)return false;try{const s=await window.XF.get('blocks/'+currentUser.uid+'/'+uid);return s.exists();}catch(e){return false;}}
async function searchUsers(query,isSidebar=false){
  const targets=[];if(isSidebar){const sr=$('sidebarSearchResults');if(sr)targets.push(sr);}else{const dr=$('discoverSearchResults');if(dr)targets.push(dr);}
  if(!query||query.length<2){targets.forEach(c=>c.innerHTML='');return;}
  const snap=await window.XF.get('users');const results=[];
  if(snap.exists()){snap.forEach(c=>{const p=c.val();if(p.uid===currentUser?.uid)return;const q=query.toLowerCase();if((p.displayName||'').toLowerCase().includes(q)||(p.handle||'').toLowerCase().includes(q))results.push(p);});}
  const html=results.slice(0,8).map(p=>`<div class="people-card" onclick="openUserProfile('${p.uid}',event)">${avatarHTML(p,'sm')}<div class="people-card-info"><div class="people-card-name">${esc(p.displayName||'Member')}${verifiedBadge(p.verified)}</div><div class="people-card-handle">@${esc(p.handle||'member')}</div></div></div>`).join('');
  targets.forEach(c=>c.innerHTML=html);
}


/* NOTIFICATIONS */
function switchNotifTab(tab,el){notifTab=tab;document.querySelectorAll('.notif-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderNotifications();}
async function renderNotifications(){
  const container=$('notifList');if(!container||!currentUser)return;container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const snap=await window.XF.get('notifications/'+currentUser.uid);
  let notifs=[];if(snap.exists())snap.forEach(c=>notifs.push({id:c.key,...c.val()}));
  notifs.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(notifTab==='mentions')notifs=notifs.filter(n=>n.type==='comment');
  if(notifTab==='connections')notifs=notifs.filter(n=>n.type==='connection_request'||n.type==='connection_accepted');
  const seen=new Set();notifs=notifs.filter(n=>{if(n.type!=='connection_request')return true;if(seen.has(n.fromUid))return false;seen.add(n.fromUid);return true;});
  if(notifs.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications</div></div>';updateNotifBadges(0);return;}
  const crNotifs=notifs.filter(n=>n.type==='connection_request'&&n.reqId&&n.fromUid);const csMap={};
  await Promise.all(crNotifs.map(async n=>{const cs=await window.XF.get('connections/'+currentUser.uid+'/'+n.fromUid);if(cs.exists()){csMap[n.reqId]='connected';return;}const rs=await window.XF.get('connectionRequests/'+n.reqId);csMap[n.reqId]=rs.exists()?rs.val().status:'pending';}));
  container.innerHTML=notifs.map(n=>{
    const cls=n.read?'':' unread';let icon='🔔',text='',actionHTML='',clickAttr='';
    if(n.type==='connection_request'){
      icon='🤝';text=`<strong>${esc(n.fromName)}</strong> wants to connect`;
      const status=csMap[n.reqId]||'pending';
      if(status==='connected'||status==='accepted')actionHTML=`<div style="margin-top:8px"><span style="color:var(--success);font-size:0.82rem;font-weight:600">✓ Connected</span></div>`;
      else if(status==='declined')actionHTML=`<div style="margin-top:8px"><span style="color:var(--text-dim);font-size:0.82rem">Declined</span></div>`;
      else actionHTML=`<div class="notif-actions" id="connBtns_${n.reqId}"><button class="btn btn-accent btn-sm" onclick="event.stopPropagation();handleAcceptConn('${n.reqId}','${n.fromUid}',this)">Accept</button><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();declineConn('${n.reqId}')">Decline</button></div>`;
      clickAttr=`onclick="markNotifRead('${n.id}');openUserProfile('${n.fromUid}',event)"`;
    }else if(n.type==='connection_accepted'){
      icon='✅';text=`<strong>${esc(n.fromName)}</strong> accepted your connection`;
      clickAttr=`onclick="markNotifRead('${n.id}');openUserProfile('${n.fromUid}',event)"`;
    }else if(n.type==='new_message'){
      icon='💬';text=`<strong>${esc(n.fromName)}</strong> sent you a message${n.preview?': <em>'+esc(n.preview)+'</em>':''}`;
      /* Click → go directly into that DM */
      clickAttr=`onclick="markNotifRead('${n.id}');navigate('messages');setTimeout(()=>openChat('${n.fromUid}'),300)"`;
    }else if(n.type==='comment'){
      icon='💬';text=`<strong>${esc(n.fromName)}</strong> replied to your post${n.preview?': <em>'+esc(n.preview)+'</em>':''}`;
      clickAttr=n.postId?`onclick="markNotifRead('${n.id}');navigate('post-detail',{postId:'${n.postId}'})"` :'';
    }else if(n.type==='like'){
      icon='❤️';text=`<strong>${esc(n.fromName)}</strong> liked your post`;
      clickAttr=n.postId?`onclick="markNotifRead('${n.id}');navigate('post-detail',{postId:'${n.postId}'})"` :'';
    }else{text=esc(n.text||'New notification');}
    return`<div class="notif-item${cls}" ${clickAttr} style="${clickAttr?'cursor:pointer':''}">
      <div class="notif-icon${cls?' accent':''}">${icon}</div>
      <div class="notif-content"><div class="notif-text">${text}</div><div class="notif-time">${timeAgo(n.createdAt)}</div>${actionHTML}</div>
    </div>`;
  }).join('');
  const unread=notifs.filter(n=>!n.read);
  if(unread.length>0){setTimeout(async()=>{const updates={};unread.forEach(n=>{updates['notifications/'+currentUser.uid+'/'+n.id+'/read']=true;});try{await window.XF.multiUpdate(updates);}catch(e){}updateNotifBadges(0);},1800);}
}
async function markNotifRead(id){if(!currentUser||!id)return;try{await window.XF.set('notifications/'+currentUser.uid+'/'+id+'/read',true);}catch(e){}}
async function pushNotif(toUid,data){try{await window.XF.push('notifications/'+toUid,data);}catch(e){}}
function startNotifWatcher(){if(!currentUser)return;window.XF.on('notifications/'+currentUser.uid,snap=>{let u=0;if(snap.exists())snap.forEach(c=>{if(!c.val().read)u++;});updateNotifBadges(u);});}
function updateNotifBadges(count){['navNotifBadge','mobileNotifBadge'].forEach(id=>{const b=$(id);if(!b)return;b.textContent=count>99?'99+':count;b.style.display=count>0?'flex':'none';});}

/* MESSAGES – real chat */
async function renderConversations(){
  const container=$('convList');if(!container||!currentUser)return;container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const connSnap=await window.XF.get('connections/'+currentUser.uid);
    if(!connSnap.exists()||!Object.keys(connSnap.val()).length){container.innerHTML='<div class="empty-state" style="padding:40px 24px"><div class="empty-state-icon">💬</div><div class="empty-state-title">No conversations</div><div class="empty-state-desc">Connect with members to start chatting</div></div>';return;}
    const uids=Object.keys(connSnap.val());const profiles={};
    await Promise.all(uids.map(async uid=>{const s=await window.XF.get('users/'+uid);if(s.exists())profiles[uid]=s.val();}));
    const previews={},unreadCounts={};
    await Promise.all(uids.map(async uid=>{const convId=[currentUser.uid,uid].sort().join('_');const dms=await window.XF.get('dms/'+convId);if(dms.exists()){const msgs=[];dms.forEach(c=>msgs.push({id:c.key,...c.val()}));if(msgs.length)previews[uid]=msgs[msgs.length-1];unreadCounts[uid]=msgs.filter(m=>m.senderUid!==currentUser.uid&&(!m.readBy||!m.readBy[currentUser.uid])).length;}}));
    uids.sort((a,b)=>(previews[b]?.createdAt||0)-(previews[a]?.createdAt||0));
    container.innerHTML=uids.map(uid=>{
      const p=profiles[uid];if(!p)return'';
      const preview=previews[uid],unread=unreadCounts[uid]||0;
      const previewTxt=preview?(preview.imageUrl?'📷 Photo':String(preview.text||'').slice(0,50)):'Start a conversation';
      const ts=preview?.createdAt?timeAgo(preview.createdAt):'';const active=chatPartnerUid===uid;
      return`<div class="conv-item${unread>0?' unread':''}${active?' active':''}" onclick="openChat('${uid}')" data-uid="${uid}">
        ${avatarHTML(p,'md')}
        <div class="conv-item-info">
          <div class="conv-item-top"><div class="conv-item-name">${esc(p.displayName||'Member')}${verifiedBadge(p.verified)}</div>${ts?`<div class="conv-item-time">${ts}</div>`:''}</div>
          <div style="display:flex;align-items:center;gap:6px"><div class="conv-item-preview">${esc(previewTxt)}</div>${unread>0?`<div class="conv-unread-count">${unread}</div>`:''}</div>
        </div>
      </div>`;
    }).filter(Boolean).join('');
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load conversations</div></div>';}
}

async function openChat(uid){
  if(!currentUser){navigate('login');return;}
  teardownChat();chatPartnerUid=uid;
  const snap=await window.XF.get('users/'+uid);chatPartnerProfile=snap.exists()?snap.val():null;
  const pane=$('chatPane');if(!pane)return;pane.classList.add('open');
  document.querySelectorAll('.conv-item').forEach(el=>el.classList.toggle('active',el.dataset.uid===uid));
  const nameEl=$('chatPartnerName'),statusEl=$('chatPartnerStatus');
  if(nameEl)nameEl.innerHTML=esc(chatPartnerProfile?.displayName||'Member')+verifiedBadge(chatPartnerProfile?.verified);
  if(statusEl){statusEl.textContent='@'+esc(chatPartnerProfile?.handle||'');statusEl.classList.remove('typing');}
  const input=$('chatInput');if(input){input.value='';autoGrow(input);}
  const imgInput=$('chatImgInput');if(imgInput){imgInput.value='';imgInput.onchange=()=>handleChatImgPreview(imgInput);}
  const convId=[currentUser.uid,uid].sort().join('_');markConvRead(convId);
  chatTypingListener=window.XF.on('typing/'+convId+'/'+uid,tSnap=>{
    const sEl=$('chatPartnerStatus');if(!sEl)return;
    const typEl=$('typingIndicator');if(typEl)typEl.style.display=tSnap.exists()&&tSnap.val()===true?'block':'none';
    const isTyping=tSnap.exists()&&tSnap.val()===true;sEl.textContent=isTyping?'typing…':'@'+esc(chatPartnerProfile?.handle||'');sEl.classList.toggle('typing',isTyping);
  });
  const msgEl=$('chatMessages');if(!msgEl)return;msgEl.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  chatMsgListener=window.XF.on('dms/'+convId,snap=>{
    if(!snap.exists()){msgEl.innerHTML='<div class="empty-state" style="padding:32px"><div class="empty-state-desc">No messages yet. Say hello! 👋</div></div>';return;}
    const msgs=[];snap.forEach(c=>msgs.push({id:c.key,...c.val()}));msgs.sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    let lastDate='';const wasAtBottom=msgEl.scrollHeight-msgEl.scrollTop-msgEl.clientHeight<80;
    msgEl.innerHTML=msgs.map(m=>{
      const isMe=m.senderUid===currentUser.uid;
      const dateStr=m.createdAt?new Date(m.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
      let dateSep='';if(dateStr!==lastDate){lastDate=dateStr;dateSep=`<div class="msg-date-separator">${dateStr}</div>`;}
      const isRead=isMe&&m.readBy&&Object.keys(m.readBy).some(k=>k!==currentUser.uid);
      const statusMark=isMe?`<span class="msg-status">${isRead?'✓✓':'✓'}</span>`:'';
      const imgHTML=m.imageUrl?`<img src="${esc(m.imageUrl)}" alt="" onclick="openLightbox('${esc(m.imageUrl)}')" style="cursor:pointer">` :'';
      const txtHTML=m.text?esc(m.text):'';
      const ts=m.createdAt?new Date(m.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
      return`${dateSep}<div class="msg-row ${isMe?'me':'them'}" data-msgid="${m.id}" data-convid="${convId}"${isMe?` oncontextmenu="showMsgMenu(event,this)" ontouchstart="startMsgHold(event,this)" ontouchend="cancelMsgHold()" ontouchmove="cancelMsgHold()"`:''}>
        ${!isMe?`<div class="msg-avatar">${avatarHTML(chatPartnerProfile,'sm')}</div>`:''}
        <div class="msg-col"><div class="msg-bubble">${imgHTML}${txtHTML}</div><div class="msg-meta ${isMe?'me':''}">${ts} ${statusMark}</div></div>
      </div>`;
    }).join('');
    if(wasAtBottom||msgs[msgs.length-1]?.senderUid===currentUser.uid)msgEl.scrollTop=msgEl.scrollHeight;
    clearTimeout(readDebounce);readDebounce=setTimeout(()=>markConvRead(convId),1000);
  });
  suppressPopstate=true;window.history.pushState({chat:uid},'',window.location.pathname);suppressPopstate=false;
}

function teardownChat(){
  if(chatMsgListener){try{chatMsgListener();}catch(e){}chatMsgListener=null;}
  if(chatTypingListener){try{chatTypingListener();}catch(e){}chatTypingListener=null;}
  if(typingTimer){clearTimeout(typingTimer);typingTimer=null;}if(readDebounce){clearTimeout(readDebounce);readDebounce=null;}
  if(currentUser&&chatPartnerUid){const cId=[currentUser.uid,chatPartnerUid].sort().join('_');window.XF.set('typing/'+cId+'/'+currentUser.uid,false).catch(()=>{});}
}
function closeChat(){teardownChat();const pane=$('chatPane');if(pane)pane.classList.remove('open');chatPartnerUid=null;chatPartnerProfile=null;document.querySelectorAll('.conv-item').forEach(el=>el.classList.remove('active'));if(activePage==='messages')renderConversations();}
function openChatPartnerProfile(){if(chatPartnerUid)openUserProfile(chatPartnerUid,null);}
function onChatInput(e){autoGrow(e.target);if(!chatPartnerUid||!currentUser)return;const cId=[currentUser.uid,chatPartnerUid].sort().join('_');window.XF.set('typing/'+cId+'/'+currentUser.uid,true).catch(()=>{});clearTimeout(typingTimer);typingTimer=setTimeout(()=>window.XF.set('typing/'+cId+'/'+currentUser.uid,false).catch(()=>{}),2500);}
function onChatKeydown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}

async function sendMessage(){
  const uid=chatPartnerUid;if(!uid||!currentUser)return;
  const input=$('chatInput');const text=input?.value?.trim();const imgInput=$('chatImgInput');const hasImg=imgInput?.files?.[0];
  if(!text&&!hasImg)return;
  if(!currentProfile?.verified&&!hasImg){const today=new Date().toISOString().slice(0,10);const key='xclub_msg_'+currentUser.uid+'_'+today;let sent=0;try{sent=parseInt(localStorage.getItem(key)||'0');}catch(e){}const LIMIT=10;if(sent>=LIMIT){showToast('Daily limit reached — verify for unlimited messages');return;}try{localStorage.setItem(key,String(sent+1));}catch(e){}const left=LIMIT-sent-1;if(left<=3)showToast(left+' free messages left today');}
  if(input){input.value='';autoGrow(input);}
  const convId=[currentUser.uid,uid].sort().join('_');window.XF.set('typing/'+convId+'/'+currentUser.uid,false).catch(()=>{});clearTimeout(typingTimer);
  try{
    if(hasImg){showToast('Uploading…');const r=await window.XCloud.upload(imgInput.files[0],'dm_images');imgInput.value='';const p=$('chatImgPreview');if(p)p.innerHTML='';await window.XF.push('dms/'+convId,{senderUid:currentUser.uid,imageUrl:r.url,text:text||'',createdAt:window.XF.ts(),readBy:{[currentUser.uid]:true}});notifyMsgRecipient(uid,'📷 Photo');}
    else{await window.XF.push('dms/'+convId,{senderUid:currentUser.uid,text,createdAt:window.XF.ts(),readBy:{[currentUser.uid]:true}});notifyMsgRecipient(uid,text);}
    refreshMsgBadge();
  }catch(err){if(input)input.value=text||'';showToast('Failed to send — check your connection');}
}
function handleChatImgPreview(inputEl){if(!inputEl?.files?.[0])return;const preview=$('chatImgPreview');if(!preview)return;const r=new FileReader();r.onload=e=>{preview.innerHTML=`<div class="img-preview-wrap"><img src="${e.target.result}" style="max-width:100px;max-height:80px;border-radius:8px"><div class="img-preview-remove" onclick="cancelChatImg()">✕</div></div>`;};r.readAsDataURL(inputEl.files[0]);}
function cancelChatImg(){const i=$('chatImgInput');if(i)i.value='';const p=$('chatImgPreview');if(p)p.innerHTML='';}
async function markConvRead(convId){if(!currentUser)return;try{const snap=await window.XF.get('dms/'+convId);if(!snap.exists())return;const updates={};snap.forEach(c=>{const m=c.val();if(m.senderUid!==currentUser.uid&&(!m.readBy||!m.readBy[currentUser.uid]))updates['dms/'+convId+'/'+c.key+'/readBy/'+currentUser.uid]=true;});if(Object.keys(updates).length){await window.XF.multiUpdate(updates);setTimeout(refreshMsgBadge,500);}}catch(e){}}
async function notifyMsgRecipient(toUid,preview){try{await pushNotif(toUid,{type:'new_message',fromUid:currentUser.uid,fromName:currentProfile?.displayName||'Member',preview:(preview||'').slice(0,40),createdAt:window.XF.ts(),read:false});}catch(e){}}
let msgHoldTimer=null;
function startMsgHold(e,el){msgHoldTimer=setTimeout(()=>showMsgMenu(e,el),500);}
function cancelMsgHold(){clearTimeout(msgHoldTimer);}
function showMsgMenu(e,el){
  e.preventDefault();e.stopPropagation();document.querySelectorAll('.msg-ctx-menu').forEach(m=>m.remove());
  const msgId=el.dataset.msgid,convId=el.dataset.convid;if(!msgId||!convId)return;
  const menu=document.createElement('div');menu.className='msg-ctx-menu';menu.innerHTML=`<div class="msg-ctx-item danger" onclick="deleteDMMsg('${convId}','${msgId}')">🗑 Delete message</div>`;
  const rect=el.getBoundingClientRect();const top=Math.min(rect.bottom+4,window.innerHeight-70);const isRight=rect.left>window.innerWidth/2;
  menu.style.cssText=`position:fixed;top:${top}px;${isRight?'right:'+(window.innerWidth-rect.right)+'px':'left:'+rect.left+'px'};z-index:9999;min-width:160px`;
  document.body.appendChild(menu);setTimeout(()=>document.addEventListener('click',function h(){menu.remove();document.removeEventListener('click',h);},{once:true}),50);
}
async function deleteDMMsg(convId,msgId){document.querySelectorAll('.msg-ctx-menu').forEach(m=>m.remove());try{await window.XF.remove('dms/'+convId+'/'+msgId);}catch(e){showToast('Could not delete');}}
async function refreshMsgBadge(){if(!currentUser)return;try{const cs=await window.XF.get('connections/'+currentUser.uid);if(!cs.exists()){updateMsgBadges(0);return;}let total=0;await Promise.all(Object.keys(cs.val()).map(async uid=>{const cId=[currentUser.uid,uid].sort().join('_');const snap=await window.XF.get('dms/'+cId);if(!snap.exists())return;snap.forEach(c=>{const m=c.val();if(m.senderUid!==currentUser.uid&&(!m.readBy||!m.readBy[currentUser.uid]))total++;});}));updateMsgBadges(total);}catch(e){}}
function updateMsgBadges(count){['navMsgBadge','mobileMsgBadge'].forEach(id=>{const b=$(id);if(!b)return;b.textContent=count>99?'99+':count;b.style.display=count>0?'flex':'none';});}
function startMsgWatcher(){refreshMsgBadge();setInterval(refreshMsgBadge,15000);}

/* OWN PROFILE */
async function renderOwnProfile(){
  if(!currentUser||!currentProfile){navigate('login');return;}const container=$('ownProfileContent');if(!container)return;
  const postsSnap=await window.XF.get('posts');const posts=[];if(postsSnap.exists())postsSnap.forEach(c=>{const p=c.val();if(p.authorUid===currentUser.uid)posts.push({id:c.key,...p});});posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const fv=!currentProfile.followersHidden;
  container.innerHTML=`
    <div class="profile-banner" style="position:relative">
      ${currentProfile.bannerURL?`<img src="${esc(currentProfile.bannerURL)}" style="width:100%;height:100%;object-fit:cover">`:'<div style="width:100%;height:100%;background:var(--bg-3)"></div>'}
      <label class="profile-banner-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Cover<input type="file" accept="image/*" style="display:none" onchange="uploadBannerPhoto(this)"></label>
    </div>
    <div class="profile-info-section">
      <div class="profile-avatar-row">
        <div class="profile-avatar-wrap">${avatarHTML(currentProfile,'xl')}<label class="profile-camera-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><input type="file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this)"></label></div>
        <div class="profile-action-row"><button class="btn btn-outline btn-sm" onclick="showEditProfile()">Edit profile</button><button class="btn btn-outline btn-sm" onclick="shareProfile()">Share</button>${!currentProfile.verified?`<button class="btn btn-accent btn-sm" onclick="showPaywall()">✓ Get Verified</button>`:''}</div>
      </div>
      <div class="profile-name">${esc(currentProfile.displayName||'Member')}${verifiedBadge(currentProfile.verified,true)}</div>
      <div class="profile-handle">@${esc(currentProfile.handle||'member')}</div>
      ${currentProfile.bio?`<div class="profile-bio">${esc(currentProfile.bio)}</div>`:'<div class="profile-bio" style="color:var(--text-muted)">No bio yet</div>'}
      <div class="profile-stats"><div class="profile-stat"><strong>${formatCount(currentProfile.followersCount||0)}</strong> Followers</div><div class="profile-stat"><strong>${formatCount(currentProfile.followingCount||0)}</strong> Following</div><div class="profile-stat"><strong>${formatCount(currentProfile.postsCount||0)}</strong> Posts</div></div>
      <div class="privacy-row"><span class="privacy-label">Show followers publicly</span><label class="toggle-switch"><input type="checkbox" ${fv?'checked':''} onchange="toggleFollowersPrivacy(this.checked)"><div class="toggle-track"></div><div class="toggle-thumb"></div></label></div>
    </div>
    <div class="profile-tabs"><div class="profile-tab active" onclick="switchOwnProfileTab('posts',this)">Posts</div><div class="profile-tab" onclick="switchOwnProfileTab('media',this)">Media</div></div>
    <div id="ownProfilePosts">${posts.length===0?'<div class="empty-state"><div class="empty-state-desc">No posts yet</div></div>':posts.map(p=>p.type==='business'?bizPostHTML(p,currentProfile):postHTML(p,currentProfile)).join('')}</div>`;
  setTimeout(()=>makePhotosClickable(container,currentProfile),50);renderProfileViewers(currentUser.uid,container);
}
function switchOwnProfileTab(tab,el){document.querySelectorAll('#ownProfileContent .profile-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');const c=$('ownProfilePosts');if(!c)return;c.querySelectorAll('.post').forEach(p=>{p.style.display=(tab==='media'&&!p.querySelector('.post-image'))?'none':'';});}
async function uploadProfilePhoto(input){if(!input.files[0])return;showToast('Uploading…');try{const r=await window.XCloud.upload(input.files[0],'x_profiles');await window.XF.update('users/'+currentUser.uid,{photoURL:r.url});await window.XF.updateProfile({photoURL:r.url});currentProfile.photoURL=r.url;showToast('Photo updated!');renderOwnProfile();updateNavUser();updateComposerAvatar();}catch(err){showToast('Upload failed');}}
async function uploadBannerPhoto(input){if(!input.files[0])return;showToast('Uploading…');try{const r=await window.XCloud.upload(input.files[0],'x_banners');await window.XF.update('users/'+currentUser.uid,{bannerURL:r.url});currentProfile.bannerURL=r.url;showToast('Cover updated!');renderOwnProfile();}catch(err){showToast('Upload failed');}}
function showEditProfile(){if(!currentProfile)return;$('editDisplayName').value=currentProfile.displayName||'';$('editBio').value=currentProfile.bio||'';const h=$('editHandle');if(h)h.value=currentProfile.handle||'';$('editProfileModal').classList.add('open');}
async function saveProfile(){
  const name=$('editDisplayName').value.trim(),bio=$('editBio').value.trim();if(!name)return showToast('Name cannot be empty');
  const updates={displayName:name,bio};const h=$('editHandle');
  if(h){const nh=h.value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');if(nh&&nh!==currentProfile.handle){if(nh.length<3){showToast('Handle must be at least 3 characters');return;}const snap=await window.XF.get('handles/'+nh);if(snap.exists()){showToast('@'+nh+' is already taken');return;}await window.XF.remove('handles/'+currentProfile.handle);await window.XF.set('handles/'+nh,currentUser.uid);updates.handle=nh;}}
  await window.XF.update('users/'+currentUser.uid,updates);await window.XF.updateProfile({displayName:name});Object.assign(currentProfile,updates);closeModal('editProfileModal');showToast('Profile updated');renderOwnProfile();updateNavUser();
}
async function toggleFollowersPrivacy(checked){await window.XF.update('users/'+currentUser.uid,{followersHidden:!checked});currentProfile.followersHidden=!checked;showToast(checked?'Followers list public':'Followers list hidden');}
function shareProfile(){if(!currentProfile)return;const url=window.location.origin+window.location.pathname+'?user='+encodeURIComponent(currentProfile.handle||currentUser.uid);if(navigator.share)navigator.share({title:currentProfile.displayName+' — X-Musk Financial Club',url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>showToast('Link copied!')).catch(()=>showToast('Link: '+url));}

/* USER PROFILE */
async function openUserProfile(uid,e){if(e)e.stopPropagation();if(uid===currentUser?.uid){navigate('profile');return;}navigate('user-profile',{uid});}
async function renderUserProfile(uid){
  const container=$('userProfileContent');if(!container||!uid)return;container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  try{
    const blocked=await isBlocked(uid);const snap=await window.XF.get('users/'+uid);if(!snap.exists()){container.innerHTML='<div class="empty-state"><div class="empty-state-title">User not found</div></div>';return;}const profile=snap.val();
    if(blocked){container.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="empty-state-icon">🚫</div><div class="empty-state-title">You've blocked this user</div><button class="btn btn-outline btn-sm" style="margin-top:20px" onclick="unblockUser('${uid}','${esc(profile.displayName||'Member')}').then(()=>renderUserProfile('${uid}'))">Unblock</button></div>`;return;}
    let connStatus='none';if(currentUser){const cs=await window.XF.get('connections/'+currentUser.uid+'/'+uid);if(cs.exists()){connStatus='connected';}else{const r1=await window.XF.get('connectionRequests/'+uid+'_'+currentUser.uid);const r2=await window.XF.get('connectionRequests/'+currentUser.uid+'_'+uid);if((r1.exists()&&r1.val().status==='pending')||(r2.exists()&&r2.val().status==='pending'))connStatus='pending';}}
    const psnap=await window.XF.get('posts');const posts=[];if(psnap.exists())psnap.forEach(c=>{const p=c.val();if(p.authorUid===uid)posts.push({id:c.key,...p});});posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const fh=profile.followersHidden&&uid!==currentUser?.uid;
    container.innerHTML=`
      <div class="profile-banner">${profile.bannerURL?`<img src="${esc(profile.bannerURL)}" style="width:100%;height:100%;object-fit:cover">`:'<div style="width:100%;height:100%;background:var(--bg-3)"></div>'}</div>
      <div class="profile-info-section">
        <div class="profile-avatar-row">
          <div class="profile-avatar-wrap">${avatarHTML(profile,'xl')}</div>
          <div class="profile-action-row">
            ${currentUser&&uid!==currentUser.uid?connectBtnHTML(uid,connStatus):''}
            ${!currentUser?`<button class="btn btn-primary btn-sm" onclick="navigate('register')">Connect</button>`:''}
            ${connStatus==='connected'?`<button class="btn btn-outline btn-sm" onclick="navigate('messages');setTimeout(()=>openChat('${uid}'),300)">Message</button>`:''}
            <button class="btn btn-ghost btn-sm" onclick="shareUserProfile('${uid}','${esc(profile.displayName||'')}','${esc(profile.handle||uid)}')">Share</button>
            ${currentUser&&uid!==currentUser.uid?`<button class="btn btn-danger btn-sm" onclick="blockUser('${uid}','${esc(profile.displayName||'Member')}')">Block</button>`:''}
          </div>
        </div>
        <div class="profile-name">${esc(profile.displayName||'Member')}${verifiedBadge(profile.verified,true)}</div>
        <div class="profile-handle">@${esc(profile.handle||'member')}</div>
        ${profile.bio?`<div class="profile-bio">${esc(profile.bio)}</div>`:''}
        <div class="profile-stats"><div class="profile-stat"><strong>${fh?'—':formatCount(profile.followersCount||0)}</strong> Followers</div><div class="profile-stat"><strong>${formatCount(profile.followingCount||0)}</strong> Following</div><div class="profile-stat"><strong>${formatCount(profile.postsCount||0)}</strong> Posts</div></div>
      </div>
      <div class="profile-tabs"><div class="profile-tab active" onclick="switchUserProfileTab('posts',this)">Posts</div><div class="profile-tab" onclick="switchUserProfileTab('media',this)">Media</div></div>
      <div id="userProfilePosts">${posts.length===0?'<div class="empty-state"><div class="empty-state-desc">No posts yet</div></div>':posts.map(p=>p.type==='business'?bizPostHTML(p,profile):postHTML(p,profile)).join('')}</div>`;
    recordProfileView(uid);setTimeout(()=>makePhotosClickable(container,profile),50);renderProfileViewers(uid,container);
  }catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load profile</div></div>';}
}
function switchUserProfileTab(tab,el){document.querySelectorAll('#userProfileContent .profile-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');const c=$('userProfilePosts');if(!c)return;c.querySelectorAll('.post').forEach(p=>{p.style.display=(tab==='media'&&!p.querySelector('.post-image'))?'none':'';});}
function shareUserProfile(uid,name,handle){const url=window.location.origin+window.location.pathname+'?user='+encodeURIComponent(handle||uid);if(navigator.share)navigator.share({title:(name||'Member')+' — X-Musk Financial Club',url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>showToast('Link copied!')).catch(()=>showToast('Link: '+url));}
async function recordProfileView(pUid){if(!currentUser||pUid===currentUser.uid)return;try{await window.XF.set('profileViews/'+pUid+'/'+currentUser.uid,{uid:currentUser.uid,displayName:currentProfile?.displayName||'Member',handle:currentProfile?.handle||'member',photoURL:currentProfile?.photoURL||'',viewedAt:window.XF.ts()});}catch(e){}}
async function renderProfileViewers(pUid,containerEl){
  if(!currentUser||pUid!==currentUser.uid)return;
  try{const snap=await window.XF.get('profileViews/'+pUid);if(!snap.exists())return;const viewers=[];snap.forEach(c=>viewers.push(c.val()));viewers.sort((a,b)=>(b.viewedAt||0)-(a.viewedAt||0));const recent=viewers.slice(0,5);if(!recent.length)return;
    const strip=document.createElement('div');strip.className='profile-viewers-strip';strip.style.position='relative';
    strip.innerHTML=`<div class="profile-viewers-avatars">${recent.map(v=>avatarHTML(v,'sm')).join('')}</div><div class="profile-viewers-label">${recent.length} recent viewer${recent.length>1?'s':''}</div>`;
    strip.onclick=function(e){e.stopPropagation();let panel=strip.querySelector('.profile-viewers-panel');if(panel){panel.remove();return;}panel=document.createElement('div');panel.className='profile-viewers-panel';panel.innerHTML=viewers.slice(0,10).map(v=>`<div class="profile-viewer-row" onclick="openUserProfile('${v.uid}',event)">${avatarHTML(v,'sm')}<div><div class="profile-viewer-name">${esc(v.displayName||'Member')}</div><div class="profile-viewer-handle">@${esc(v.handle||'member')} · ${timeAgo(v.viewedAt)}</div></div></div>`).join('');strip.appendChild(panel);setTimeout(()=>document.addEventListener('click',function h(){panel.remove();document.removeEventListener('click',h);},{once:true}),50);};
    containerEl.insertBefore(strip,containerEl.firstChild);}catch(e){}
}
function makePhotosClickable(el,profile){const b=el.querySelector('.profile-banner img');if(b){b.style.cursor='pointer';b.onclick=e=>{e.stopPropagation();openLightbox(profile.bannerURL);};}const a=el.querySelector('.profile-avatar-wrap img,.profile-avatar-wrap .avatar');if(a&&profile.photoURL){a.style.cursor='pointer';a.onclick=e=>{e.stopPropagation();openLightbox(profile.photoURL)};}}

/* INVESTMENTS */
async function openInvestModal(postId){
  if(!requireVerified('invest'))return;const snap=await window.XF.get('posts/'+postId);if(!snap.exists())return;const post=snap.val();
  const raised=post.bizRaised||0,target=post.bizTarget||1,pct=Math.min(100,Math.round((raised/target)*100));
  const currency=post.bizCurrency||'EUR',sym=currSym(currency);const isLarge=['NGN','TZS','UGX','RWF'].includes(currency);
  const amts=isLarge?[50000,100000,250000,500000,1000000,2500000]:[500,1000,2500,5000,10000,25000];
  $('investModalTitle').textContent=post.bizTitle||'Invest';
  $('investModalBody').innerHTML=`<div style="margin-bottom:16px"><div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:4px">Amount raised</div><div style="font-size:1.6rem;font-weight:700;color:var(--accent)">${sym}${Number(raised).toLocaleString()}</div><div style="font-size:0.78rem;color:var(--text-dim)">of ${sym}${Number(target).toLocaleString()} target · ${pct}% funded</div></div><div class="invest-progress-track" style="margin-bottom:20px"><div class="invest-progress-fill" style="width:${pct}%"></div></div><div style="font-size:0.85rem;font-weight:700;margin-bottom:10px;color:var(--text-dim)">Choose amount (${currency}):</div><div class="invest-amount-grid">${amts.map(a=>`<div class="invest-amount-btn" onclick="selectInvestAmt(this,${a})">${sym}${a.toLocaleString()}</div>`).join('')}</div><div class="form-group" style="margin-bottom:16px"><input id="customInvestAmt" class="form-input" type="number" placeholder="Or enter custom amount" min="1"></div><button class="btn btn-accent btn-block btn-lg" onclick="confirmInvestment('${postId}')">Pay via Flutterwave →</button><div style="font-size:0.74rem;color:var(--text-muted);margin-top:10px;text-align:center">Secure checkout via Flutterwave</div>`;
  $('investModal').classList.add('open');
}
function selectInvestAmt(el,amount){document.querySelectorAll('.invest-amount-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');selectedInvestAmt=amount;$('customInvestAmt').value='';}
async function confirmInvestment(postId){const cv=parseFloat($('customInvestAmt').value);const amount=cv>0?cv:selectedInvestAmt;if(!amount||amount<=0)return showToast('Select or enter an amount');const snap=await window.XF.get('posts/'+postId);if(!snap.exists())return;const post={id:postId,...snap.val()};const ex=await window.XF.get('investments/'+postId+'/'+currentUser.uid);if(ex.exists()&&ex.val().status==='paid'){showToast('You have already invested');return;}closeModal('investModal');showToast('Redirecting to payment…');setTimeout(()=>launchFlutterwave(post,amount),600);}
async function openManageInvest(postId){const snap=await window.XF.get('posts/'+postId);if(!snap.exists())return;const post=snap.val();$('manageInvestBody').innerHTML=`<div style="margin-bottom:16px"><div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:6px">Current raised</div><div style="font-size:2rem;font-weight:800;color:var(--success)">${currSym(post.bizCurrency)}${Number(post.bizRaised||0).toLocaleString()}</div><div style="font-size:0.78rem;color:var(--text-dim)">${post.investorCount||0} investors</div></div><div class="form-group"><label class="form-label">Set raised amount</label><input id="manageRaisedInput" class="form-input" type="number" value="${post.bizRaised||0}" min="0"></div><div class="form-group"><label class="form-label">Set investor count</label><input id="manageCountInput" class="form-input" type="number" value="${post.investorCount||0}" min="0"></div><button class="btn btn-accent btn-block" onclick="saveManageInvest('${postId}')">Save Changes</button>`;$('manageInvestModal').classList.add('open');}
async function saveManageInvest(postId){const raised=parseInt($('manageRaisedInput').value)||0,count=parseInt($('manageCountInput').value)||0;try{await window.XF.update('posts/'+postId,{bizRaised:raised,investorCount:count});closeModal('manageInvestModal');showToast('Investment updated!');renderFeed();}catch(err){showToast('Failed to update');}}
function launchFlutterwave(post,amount){const c=post.bizCurrency||'EUR',ref='xclub_'+post.id+'_'+currentUser?.uid+'_'+Date.now();if(typeof FlutterwaveCheckout==='undefined'){showToast('Payment system loading — try again');return;}FlutterwaveCheckout({public_key:FLW_PUBLIC_KEY,tx_ref:ref,amount,currency:c,payment_options:'card,banktransfer,ussd',customer:{email:currentUser?.email||'',name:currentProfile?.displayName||'Investor'},customizations:{title:post.bizTitle||'Investment',description:'Investment via X-Musk Financial Club',logo:''},callback:async function(data){if(data.status==='successful'||data.status==='completed'){try{await window.XF.set('investments/'+post.id+'/'+currentUser.uid,{uid:currentUser.uid,name:currentProfile?.displayName,email:currentUser.email,amount,currency:c,status:'paid',txRef:data.tx_ref||ref,transactionId:data.transaction_id||'',paidAt:window.XF.ts()});const invSnap=await window.XF.get('investments/'+post.id);let totalRaised=0,investorCount=0;if(invSnap.exists())invSnap.forEach(c=>{const v=c.val();if(v.status==='paid'){totalRaised+=(v.amount||0);investorCount++;}});await window.XF.update('posts/'+post.id,{bizRaised:totalRaised,investorCount});showToast('✅ Payment confirmed!');renderFeed();}catch(err){showToast('Payment confirmed but update failed');}}else showToast('Payment was not completed');},onclose:function(){}});}

/* SIDEBAR */
async function loadSuggestedMembers(){const c=$('suggestedMembers');if(!c||!window.XF)return;try{const snap=await window.XF.get('users');const people=[];if(snap.exists())snap.forEach(s=>{if(s.key!==currentUser?.uid)people.push(s.val());});const shown=people.filter(p=>p.verified).slice(0,3).concat(people.filter(p=>!p.verified).slice(0,2)).slice(0,4);if(!shown.length){c.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem;padding:14px 16px">No members yet</div>';return;}c.innerHTML=shown.map(p=>`<div class="sidebar-member-item" onclick="openUserProfile('${p.uid}',event)">${avatarHTML(p,'sm')}<div class="sidebar-member-info"><div class="sidebar-member-name">${esc(p.displayName||'Member')}${verifiedBadge(p.verified)}</div><div class="sidebar-member-handle">@${esc(p.handle||'member')}</div></div>${p.uid!==currentUser?.uid?`<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();sendConnReq('${p.uid}')" style="font-size:0.74rem">Connect</button>`:''}</div>`).join('');}catch(e){}}

/* GROQ / BIZ FEED */
async function getGroqKey(){if(_groqKey)return _groqKey;try{const s=await window.XF.get('config/groqKey');if(s.exists()){_groqKey=s.val();return _groqKey;}}catch(e){}return null;}
async function callGroq({system,user,maxTokens=1024}){const key=await getGroqKey();if(!key)throw new Error('No Groq key');const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'llama-3.3-70b-versatile',max_tokens:maxTokens,messages:[{role:'system',content:system},{role:'user',content:user}]})});if(!res.ok)throw new Error('Groq '+res.status);const d=await res.json();return d.choices?.[0]?.message?.content?.trim()||'';}
async function loadBizFeed(){const container=$('bizFeedContainer');if(!container)return;container.innerHTML='<div style="padding:16px;color:var(--text-dim);font-size:0.82rem">Loading insights…</div>';try{const raw=await callGroq({system:`You are a business intelligence service. Generate exactly 4 short business news snippets about oil & gas, emerging markets, tech, real estate, or global finance. Each: 1-2 sentences, confident insider tone. Respond ONLY with raw JSON array, no markdown: [{"tag":"oil","text":"..."},{"tag":"investment","text":"..."},{"tag":"tech","text":"..."},{"tag":"market","text":"..."}]. Valid tags: oil, investment, tech, market`,user:'Generate 4 fresh snippets.',maxTokens:800});const items=JSON.parse(raw.replace(/```json|```/g,'').trim());container.innerHTML=items.map(item=>`<div class="bizfeed-item"><div class="bizfeed-top"><div class="avatar avatar-sm" style="background:#111;border:1px solid #333;font-size:0.6rem;color:var(--accent)">CE</div><div><div class="bizfeed-name">Claude Engineer</div><div class="bizfeed-handle">@claudeengineer</div></div><span class="bizfeed-tag ${esc(item.tag)}">${esc(item.tag.toUpperCase())}</span></div><div class="bizfeed-text">${esc(item.text)}</div></div>`).join('');}catch(err){container.innerHTML='<div style="font-size:0.8rem;color:var(--text-dim);padding:14px">Could not load insights — add Groq key in Admin panel.</div>';}}
async function postClaudeEngineerToFeed(){try{const text=await callGroq({system:`You are Claude Engineer. Write ONE sharp post (2-4 sentences) about business, finance, tech, or markets. Confident analytical tone. No hashtags, no emojis. Respond with ONLY the post text.`,user:'Write a sharp business post.',maxTokens:512});if(!text)return;await window.XF.push('posts',{authorUid:CLAUDE_BOT_UID,text,type:'post',isBot:true,createdAt:Date.now(),commentCount:0});}catch(err){console.warn('Claude Engineer post failed:',err);}}

/* MODALS */
function closeModal(id){const m=$(id);if(m)m.classList.remove('open');}
function openLightbox(url){if(!url)return;const lb=document.createElement('div');lb.className='photo-lightbox';lb.innerHTML=`<div class="photo-lightbox-close" onclick="this.parentElement.remove()">✕</div><img src="${esc(url)}" alt="">`;lb.onclick=e=>{if(e.target===lb)lb.remove();};document.body.appendChild(lb);}

/* ADMIN */
function switchAdminTab(tab,el){document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');$('adminTabUsers').style.display=tab==='users'?'block':'none';$('adminTabPosts').style.display=tab==='posts'?'block':'none';$('adminTabStats').style.display=tab==='stats'?'block':'none';if(tab==='stats'){loadAdminStats();loadScheduledPostsAdmin();}if(tab==='posts')adminLoadPosts();}
async function loadAdminUsers(){const container=$('adminUserList');if(!container)return;container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';try{const snap=await window.XF.get('users');allUsersCache=[];if(snap.exists())snap.forEach(c=>{const v=c.val();if(v&&typeof v==='object')allUsersCache.push({id:c.key,uid:v.uid||c.key,...v});});allUsersCache.sort((a,b)=>(b.joinedAt||0)-(a.joinedAt||0));renderAdminUsers(allUsersCache);}catch(err){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">Could not load users</div></div>';}}
function renderAdminUsers(users){const container=$('adminUserList');if(!container)return;if(!users.length){container.innerHTML='<div class="empty-state"><div class="empty-state-desc">No users found</div></div>';return;}container.innerHTML=users.map(u=>`<div class="admin-user-card" id="adminCard-${u.uid}">${avatarHTML(u,'md')}<div class="admin-user-info"><div class="admin-user-name">${esc(u.displayName||'Member')} ${u.verified?'<span style="color:var(--accent);font-size:0.78rem">✓ Verified</span>':'<span style="color:var(--text-muted);font-size:0.78rem">Unverified</span>'}</div><div class="admin-user-meta">@${esc(u.handle||'?')} · ${esc(u.email||'')} · ${formatCount(u.followersCount||0)} followers</div></div><div class="admin-user-actions"><input id="flwInput-${u.uid}" type="number" value="${u.followersCount||0}" min="0" style="width:70px;padding:5px 8px;background:var(--bg-3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:0.8rem;outline:none"><button class="btn btn-accent btn-sm" onclick="adminSetFollowers('${u.uid}')">Set</button>${u.verified?`<button class="btn btn-sm" style="background:var(--danger);color:#fff;border-radius:100px;padding:5px 10px;font-size:0.76rem" onclick="adminToggleVerify('${u.uid}',false)">Unverify</button>`:`<button class="btn btn-sm" style="background:var(--success);color:#fff;border-radius:100px;padding:5px 10px;font-size:0.76rem" onclick="adminToggleVerify('${u.uid}',true)">Verify</button>`}<button class="btn btn-sm btn-danger" onclick="adminDeleteUser('${u.uid}')">Delete</button></div></div>`).join('');}
function adminSearchUsers(q){if(!q){renderAdminUsers(allUsersCache);return;}const ql=q.toLowerCase();renderAdminUsers(allUsersCache.filter(u=>(u.displayName||'').toLowerCase().includes(ql)||(u.handle||'').toLowerCase().includes(ql)||(u.email||'').toLowerCase().includes(ql)));}
async function adminSetFollowers(uid){const input=$('flwInput-'+uid);const val=parseInt(input.value);if(isNaN(val)||val<0)return showToast('Enter a valid number');try{await window.XF.update('users/'+uid,{followersCount:val});const u=allUsersCache.find(x=>x.uid===uid);if(u)u.followersCount=val;showToast('Followers updated!');}catch(err){showToast('Failed to update');}}
async function adminToggleVerify(uid,verify){try{await window.XF.update('users/'+uid,{verified:verify,...(verify?{verifiedAt:window.XF.ts()}:{verifiedAt:null})});const u=allUsersCache.find(x=>x.uid===uid);if(u)u.verified=verify;renderAdminUsers(allUsersCache);showToast(verify?'✓ User verified!':'User unverified');}catch(err){showToast('Failed to update verification');}}
async function adminDeleteUser(uid){if(!confirm('Delete this user and all their data?'))return;try{await window.XF.remove('users/'+uid);await window.XF.remove('notifications/'+uid);await window.XF.remove('connections/'+uid);allUsersCache=allUsersCache.filter(u=>u.uid!==uid);renderAdminUsers(allUsersCache);showToast('User deleted');}catch(err){showToast('Failed to delete user');}}
async function adminLoadPosts(){const container=$('adminPostList');if(!container)return;container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem">Loading…</div>';try{const snap=await window.XF.get('posts');if(!snap.exists()){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem;padding:16px">No posts</div>';return;}const posts=[];snap.forEach(c=>posts.push({id:c.key,...c.val()}));posts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));container.innerHTML=posts.slice(0,30).map(p=>{const lc=p.likes?Object.keys(p.likes).length:0;return`<div style="padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px"><div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:4px">@${esc(p.handle||p.authorUid||'?')} · ${timeAgo(p.createdAt)}</div><div style="font-size:0.85rem;margin-bottom:8px">${esc((p.text||'').slice(0,80))}${(p.text||'').length>80?'…':''}</div><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--text-dim);font-size:0.78rem">❤ ${lc} likes</span><input id="likeEdit-${p.id}" type="number" value="${lc}" min="0" style="width:70px;padding:4px 8px;background:var(--bg-3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:0.78rem;outline:none"><button class="btn btn-accent btn-sm" style="font-size:0.74rem" onclick="adminSetLikes('${p.id}')">Set Likes</button></div></div>`;}).join('');}catch(e){container.innerHTML='<div style="color:var(--text-dim);font-size:0.85rem;padding:16px">Could not load posts</div>';}}
async function adminSetLikes(postId){const input=$('likeEdit-'+postId);if(!input)return;const newCount=parseInt(input.value);if(isNaN(newCount)||newCount<0)return showToast('Enter a valid number');try{const snap=await window.XF.get('posts/'+postId+'/likes');const existing=snap.exists()?snap.val():{};const existingKeys=Object.keys(existing);const fb='_fake_like_';const updates={};existingKeys.filter(k=>k.startsWith(fb)).forEach(k=>updates['posts/'+postId+'/likes/'+k]=null);const realCount=existingKeys.filter(k=>!k.startsWith(fb)).length;const toAdd=Math.max(0,newCount-realCount);for(let i=0;i<toAdd;i++)updates['posts/'+postId+'/likes/'+fb+i]=true;await window.XF.multiUpdate(updates);showToast('Likes updated to '+newCount);adminLoadPosts();}catch(e){showToast('Failed to update likes');}}
async function loadAdminStats(){try{const us=await window.XF.get('users'),ps=await window.XF.get('posts');let total=0,verified=0,posts=0;if(us.exists())us.forEach(c=>{total++;if(c.val().verified)verified++;});if(ps.exists())ps.forEach(()=>posts++);$('statTotal').textContent=total;$('statVerified').textContent=verified;$('statPosts').textContent=posts;}catch(err){}}
async function loadScheduledPostsAdmin(){const statsTab=$('adminTabStats');if(!statsTab)return;if(!$('scheduledPostsList')){const s=document.createElement('div');s.style.marginTop='20px';s.innerHTML=`<div style="font-size:0.78rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px">Scheduled Posts</div><div id="scheduledPostsList"></div>`;statsTab.appendChild(s);}const container=$('scheduledPostsList');if(!container)return;try{const snap=await window.XF.get('scheduledPosts');if(!snap.exists()){container.innerHTML='<div style="color:var(--text-dim);font-size:0.82rem">No scheduled posts</div>';return;}const all=Object.entries(snap.val()).filter(([,p])=>p.status==='scheduled');if(!all.length){container.innerHTML='<div style="color:var(--text-dim);font-size:0.82rem">No pending</div>';return;}all.sort(([,a],[,b])=>a.fireAt-b.fireAt);container.innerHTML=all.map(([key,p])=>`<div style="padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px"><div style="font-size:0.78rem;font-weight:600;margin-bottom:4px">@${esc(p.handle||'?')} · <span style="color:var(--accent)">${new Date(p.fireAt).toLocaleString()}</span></div><div style="color:var(--text-dim);font-size:0.82rem;margin-bottom:6px">${esc(p.text)}</div><button class="btn btn-danger btn-sm" onclick="cancelScheduled('${key}')">Cancel</button></div>`).join('');}catch(e){}}
async function cancelScheduled(key){try{await window.XF.set('scheduledPosts/'+key+'/status','cancelled');showToast('Scheduled post cancelled');loadScheduledPostsAdmin();}catch(e){showToast('Could not cancel');}}
function injectAdminTools(){const statsTab=$('adminTabStats');if(!statsTab||$('adminToolsSection'))return;const section=document.createElement('div');section.id='adminToolsSection';section.style.marginTop='24px';section.innerHTML=`<div style="font-size:0.78rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-dim);margin-bottom:14px">Configuration</div><div class="form-group"><label class="form-label">Groq API Key</label><div style="display:flex;gap:8px"><input id="groqKeyInput" class="form-input" type="password" placeholder="gsk_..."><button class="btn btn-accent btn-sm" onclick="saveGroqKey()">Save</button></div></div><div class="form-group"><label class="form-label">Flutterwave Public Key</label><div style="display:flex;gap:8px"><input id="flwKeyInput" class="form-input" type="password" placeholder="FLWPUBK-..."><button class="btn btn-accent btn-sm" onclick="saveFlwKey()">Save</button></div></div><div class="form-group"><label class="form-label">Claude Engineer Bot</label><button id="cePostBtn" class="btn btn-outline btn-sm" onclick="triggerCEPost()">Post to Feed Now</button></div>`;statsTab.appendChild(section);window.XF.get('config/groqKey').then(s=>{if(s.exists()&&s.val()){const e=$('groqKeyInput');if(e)e.value='••••••••••••••••';}}).catch(()=>{});window.XF.get('config/flwKey').then(s=>{if(s.exists()&&s.val()){const e=$('flwKeyInput');if(e)e.value='••••••••••••••••';}}).catch(()=>{});}
async function triggerCEPost(){const btn=$('cePostBtn');if(btn){btn.disabled=true;btn.textContent='Posting…';}await postClaudeEngineerToFeed();if(btn){btn.disabled=false;btn.textContent='Post to Feed Now';}showToast('Claude Engineer posted!');}
async function saveGroqKey(){const input=$('groqKeyInput');if(!input)return;const val=input.value.trim();if(!val||val.startsWith('•')){showToast('Paste your Groq key first');return;}if(!val.startsWith('gsk_')){showToast('Invalid key — must start with gsk_');return;}try{await window.XF.set('config/groqKey',val);_groqKey=val;input.value='••••••••••••••••';showToast('[OK] Groq key saved');}catch(e){showToast('Failed to save key');}}
async function saveFlwKey(){const input=$('flwKeyInput');if(!input)return;const val=input.value.trim();if(!val||val.startsWith('•')){showToast('Paste your Flutterwave key first');return;}if(!val.startsWith('FLWPUBK')){showToast('Invalid key — must start with FLWPUBK');return;}try{await window.XF.set('config/flwKey',val);FLW_PUBLIC_KEY=val;input.value='••••••••••••••••';showToast('[OK] Flutterwave key saved');}catch(e){showToast('Failed to save key');}}

/* INIT */
document.addEventListener('DOMContentLoaded',async()=>{
  applyStoredTheme();
  window.history.replaceState({page:'root'},'',window.location.pathname);
  const failsafe=setTimeout(()=>{hideLoader();navigate('landing');},8000);
  try{
    await window.XFire.load();
    window.XF.onAuth(user=>{clearTimeout(failsafe);onAuthChange(user);});
    setTimeout(loadBizFeed,3000);
  }catch(err){clearTimeout(failsafe);console.error('Firebase failed:',err);hideLoader();navigate('landing');}
});
