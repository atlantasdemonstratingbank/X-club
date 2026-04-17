/* app.js — X Club Main Application Logic */
'use strict';

/* ══════════════════════════════════════════════════
   TRANSLATIONS  (437 keys across EN / PT / ES / DE)
══════════════════════════════════════════════════ */
const T = {
en: {
  'nav.home':'Home','nav.membership':'Membership','nav.auctions':'Auctions',
  'nav.events':'Events','nav.dashboard':'Dashboard',
  'nav.memberArea':'Member Area','nav.applyForMembership':'Apply for Membership',
  'nav.memberLogin':'Sign In','nav.skipToContent':'Skip to content',
  'hero.badge':'Applications Open — 2025',
  'hero.title1':'Where the world\'s most','hero.title2':'distinguished individuals',
  'hero.title3':'convene privately.',
  'hero.subtitle':'X Club is an invitation-exclusive private membership for verified high-net-worth individuals. Network, invest, bid, and belong — with absolute discretion.',
  'hero.ctaPrimary':'Request an Invitation','hero.ctaSecondary':'Explore Membership',
  'hero.stat1':'Verified Members','hero.stat2':'Assets at Auction',
  'hero.stat3':'Countries Represented','hero.stat4':'Identity Verified',
  'hero.scrollCue':'Discover',
  'features.eyebrow':'The Experience','features.title':'Everything you\'d expect.\nNothing you\'ll find elsewhere.',
  'features.subtitle':'A curated environment for those who have already succeeded.',
  'features.f1.title':'Military-Grade Privacy','features.f1.desc':'End-to-end encrypted communications. Zero third-party data sharing.',
  'features.f2.title':'AI-Powered Matching','features.f2.desc':'Our algorithm identifies co-investment opportunities and kindred individuals.',
  'features.f3.title':'Luxury Auctions','features.f3.desc':'Bid on rare art, vintage watches, yacht shares, and private residences.',
  'features.f4.title':'Private Events','features.f4.desc':'Intimate virtual summits, city dinners, investment roundtables, and cultural experiences.',
  'features.f5.title':'Personal Concierge','features.f5.desc':'Your concierge handles reservations, travel, and special requests. 24/7.',
  'features.f6.title':'Deal Rooms','features.f6.desc':'Private encrypted deal rooms. Document vault, e-signature, NDA. (Private Tier.)',
  'testimonials.eyebrow':'Members Speak','testimonials.title':'The highest recommendation\nis a silent one.',
  'testimonials.t1.text':'The matching algorithm introduced me to two co-investors in my first month. No other network comes close.',
  'testimonials.t1.name':'E. Hoffmann','testimonials.t1.role':'Private Equity, Frankfurt — Private Tier',
  'testimonials.t2.text':'I\'m 74 and not particularly technical. The onboarding team walked me through by phone. I felt welcomed, not overwhelmed.',
  'testimonials.t2.name':'R. Castellanos','testimonials.t2.role':'Retired Entrepreneur, Miami — Classic Tier',
  'testimonials.t3.text':'I acquired a fractional share of a 52m sailing yacht at auction. The process was seamless. Extraordinary.',
  'testimonials.t3.name':'A. Nkosi','testimonials.t3.role':'Tech Founder, London — Private Tier',
  'eventsTeaser.eyebrow':'Calendar','eventsTeaser.title':'Upcoming Events','eventsTeaser.viewAll':'View All Events',
  'eventsTeaser.e1.title':'Global Alternative Assets Roundtable','eventsTeaser.e1.tier':'Private Tier',
  'eventsTeaser.e1.format':'Virtual — Encrypted','eventsTeaser.e1.time':'15:00 CET','eventsTeaser.e1.capacity':'24 seats available',
  'eventsTeaser.e2.title':'Members\' Dinner — Monaco','eventsTeaser.e2.tier':'All Members',
  'eventsTeaser.e2.location':'Hôtel de Paris, Monte-Carlo','eventsTeaser.e2.time':'20:00 CET','eventsTeaser.e2.capacity':'6 seats available',
  'eventsTeaser.e3.title':'Art Acquisition Masterclass','eventsTeaser.e3.tier':'All Members',
  'eventsTeaser.e3.format':'Virtual — Encrypted','eventsTeaser.e3.time':'17:00 GMT','eventsTeaser.e3.capacity':'60 seats available',
  'privacy.eyebrow':'Discretion First',
  'privacy.title':'Your privacy is not a feature.\nIt is the foundation.',
  'privacy.desc':'X Club enforces a strict non-disclosure policy. AI moderation scans every message in real time.',
  'privacy.p1.title':'End-to-End Encryption','privacy.p1.desc':'All messages and documents are encrypted in transit and at rest.',
  'privacy.p2.title':'AI Safety Moderation','privacy.p2.desc':'Our AI intercepts attempts to share phone numbers or emails.',
  'privacy.p3.title':'Zero Data Sharing','privacy.p3.desc':'X Club never sells or shares member data with third parties.',
  'cta.title':'Ready to apply?','cta.desc':'Membership by application only. We respond within 5 business days.',
  'cta.btn':'Begin Application',
  'footer.tagline':'The world\'s most exclusive private digital club. Est. 2024.',
  'footer.badge1':'Fully Encrypted','footer.badge2':'GDPR Compliant',
  'footer.col1.title':'Membership','footer.col1.l1':'Classic Tier','footer.col1.l2':'Private Tier',
  'footer.col1.l3':'Apply Now','footer.col1.l4':'Verification',
  'footer.col2.title':'Platform','footer.col2.l1':'Auctions','footer.col2.l2':'Events',
  'footer.col2.l3':'Messages','footer.col2.l4':'Concierge',
  'footer.col3.title':'Company','footer.col3.l1':'About X Club','footer.col3.l2':'Privacy Policy',
  'footer.col3.l3':'Terms of Service','footer.col3.l4':'Contact',
  'footer.copyright':'© 2025 X Club. All rights reserved.','footer.privacy':'Privacy','footer.terms':'Terms','footer.cookies':'Cookies',
  'mem.eyebrow':'Membership Tiers','mem.title':'Two paths.\nOne extraordinary community.',
  'mem.subtitle':'Both tiers grant access to a verified network.',
  'mem.classic.badge':'X Club Classic','mem.classic.name':'Classic',
  'mem.classic.priceNote':'From $2,000 to $8,000/year · Net worth $1M+',
  'mem.classic.desc':'For successful individuals who value meaningful connections and a trusted network.',
  'mem.classic.f1':'Access to verified network','mem.classic.f2':'Private encrypted messaging',
  'mem.classic.f3':'Events & virtual summits','mem.classic.f4':'Standard auction access',
  'mem.classic.f5':'Basic AI matching','mem.classic.f6':'Basic concierge services',
  'mem.classic.f7':'Phone & video support','mem.classic.f8':'Font size & high-contrast mode',
  'mem.classic.cta':'Apply for Classic',
  'mem.private.recommended':'Most Exclusive','mem.private.badge':'X Club Private','mem.private.name':'Private',
  'mem.private.priceNote':'From $15,000 · By invitation for $30M+ net worth',
  'mem.private.desc':'The full X Club experience. Priority access, enhanced AI matching, and exclusive deal infrastructure.',
  'mem.private.f1':'Everything in Classic, enhanced','mem.private.f2':'Encrypted deal rooms & vault',
  'mem.private.f3':'Syndicate & co-investment tools','mem.private.f4':'Priority access to luxury auctions',
  'mem.private.f5':'Enhanced AI matching','mem.private.f6':'Dedicated 24/7 concierge',
  'mem.private.f7':'Priority seats at events','mem.private.f8':'Committee-verified wealth confirmation',
  'mem.private.cta':'Request Private Invitation',
  'mem.privacyBanner':'Please keep all contact details within the platform. Members are never asked to share personal numbers or external handles.',
  'auctions.eyebrow':'Live Auctions','auctions.title':'Rare. Verified.\nExclusively available here.',
  'auctions.subtitle':'All items independently authenticated and insured. Proxy bidding available.',
  'auctions.filter.all':'All Categories','auctions.filter.art':'Fine Art','auctions.filter.watches':'Timepieces',
  'auctions.filter.marine':'Marine','auctions.filter.real':'Real Estate',
  'auctions.filter.exp':'Experiences','auctions.filter.jewellery':'Jewellery',
  'auctions.privacyBanner':'All auction communication is conducted exclusively through the X Club platform.',
  'events.eyebrow':'Events & Gatherings','events.title':'Curated moments for\nextraordinary people.',
  'dash.tier':'Private Tier','dash.nav.main':'Main','dash.nav.overview':'Overview',
  'dash.nav.messages':'Messages','dash.nav.network':'My Network','dash.nav.auctions':'Auctions',
  'dash.nav.events':'Events','dash.nav.private':'Private','dash.nav.dealRooms':'Deal Rooms',
  'dash.nav.vault':'Document Vault','dash.nav.services':'Services',
  'dash.nav.concierge':'Concierge','dash.nav.aiMatching':'AI Matching',
  'dash.nav.account':'Account','dash.nav.settings':'Settings','dash.nav.signOut':'Sign Out',
  'dash.curatorHelp.title':'Need help?','dash.curatorHelp.desc':'Speak with your curator',
  'dash.overview.eyebrow':'Dashboard','dash.overview.greeting':'Good morning, Alexandra.',
  'dash.overview.tagline':'Your network insights for today.',
  'dash.stats.connections':'Connections','dash.stats.connectionsChange':'12 this month',
  'dash.stats.activeBids':'Active Bids','dash.stats.bidsChange':'2 leading',
  'dash.stats.upcomingEvents':'Upcoming Events','dash.stats.eventsChange':'2 this week',
  'dash.stats.matches':'AI Matches','dash.stats.matchesNew':'New today',
  'dash.activity.title':'Recent Activity','dash.activity.viewAll':'View all',
  'dash.matches.title':'AI Member Matches','dash.matches.subtitle':'Selected by compatibility',
  'dash.matches.badge':'5 New','dash.bids.title':'Your Active Bids',
  'dash.concierge.title':'Your Concierge',
  'dash.concierge.desc':'Around the clock. Whatever you need — it\'s done.',
  'dash.concierge.btn':'Make a Request',
  'dash.network.eyebrow':'Network','dash.network.title':'Your Private Network',
  'dash.network.comingSoon':'Network graph coming soon.',
  'dash.dealrooms.eyebrow':'Private','dash.dealrooms.title':'Deal Rooms',
  'dash.dealrooms.privacyNote':'Fully encrypted. Never share documents outside the platform.',
  'dash.dealrooms.comingSoon':'Your deal rooms will appear here.',
  'dash.vault.eyebrow':'Secure Storage','dash.vault.title':'Document Vault',
  'dash.vault.desc':'End-to-end encrypted document storage.',
  'dash.matching.eyebrow':'AI-Powered','dash.matching.title':'Member Matching',
  'dash.matching.desc':'Our AI has found 5 new members with aligned interests.',
  'dash.settings.eyebrow':'Account','dash.settings.title':'Settings & Preferences',
  'dash.settings.display':'Display & Accessibility','dash.settings.fontSize':'Font Size',
  'dash.settings.fontNormal':'Normal (16px)','dash.settings.fontLarge':'Large (18px)',
  'dash.settings.fontXLarge':'Extra Large (20px)','dash.settings.contrast':'High Contrast Mode',
  'dash.settings.sound':'Sound Effects','dash.settings.language':'Language',
  'msgs.eyebrow':'Encrypted','msgs.title':'Private Messages','msgs.backToDash':'← Dashboard',
  'msgs.privacyReminder':'All messages are end-to-end encrypted. Never share contact details on this platform.',
  'msgs.inbox':'Inbox','msgs.newMessage':'+ New','msgs.privateStatus':'🔒 Encrypted · Private Member',
  'onboarding.back':'← Back','onboarding.step1':'Tier','onboarding.step2':'Profile',
  'onboarding.step3':'Verify','onboarding.step4':'Review','onboarding.title':'Your Application',
  'onboarding.subtitle':'Tell us about yourself. Everything is encrypted and reviewed by the committee only.',
  'onboarding.form.firstName':'First Name','onboarding.form.lastName':'Last Name',
  'onboarding.form.email':'Email Address','onboarding.form.password':'Password',
  'onboarding.form.tier':'Membership Tier','onboarding.form.tierSelect':'Select a tier…',
  'onboarding.form.tierClassic':'X Club Classic ($2,000–$8,000/year)',
  'onboarding.form.tierPrivate':'X Club Private ($15,000+/year)',
  'onboarding.form.country':'Country of Residence','onboarding.form.profession':'Professional Background',
  'onboarding.form.professionSelect':'Select a field…',
  'onboarding.form.prof1':'Finance & Investment','onboarding.form.prof2':'Technology & Venture',
  'onboarding.form.prof3':'Real Estate','onboarding.form.prof4':'Family Office',
  'onboarding.form.prof5':'Entrepreneur','onboarding.form.prof6':'Arts & Culture',
  'onboarding.form.prof7':'Other',
  'onboarding.privacyNote':'Your data is encrypted and never shared.',
  'onboarding.continue':'Continue',
  'onboarding.curatorHelp.title':'Need help filling this in?',
  'onboarding.curatorHelp.desc':'Speak with a curator by phone — Mon–Fri, 8am–8pm CET.',
  'concierge.eyebrow':'Personal Service','concierge.title':'Your Personal Concierge',
  'concierge.back':'← Dashboard',
  'concierge.hero.title':'Whatever you need — it\'s done.',
  'concierge.hero.desc':'Your concierge is available 24h/7d.',
  'concierge.categories.title':'How can we help you?','concierge.form.title':'Submit a Request',
  'concierge.form.detail':'Describe your request',
  'concierge.form.helper':'Encrypted. Do not share contact details here.',
  'concierge.form.urgency':'Urgency','concierge.form.urgencyStd':'Standard (24 hours)',
  'concierge.form.urgencyPriority':'Priority (4 hours)','concierge.form.urgencyUrgent':'Urgent (1 hour)',
  'concierge.form.submit':'Submit Request',
  'concierge.privacyNote':'Never share personal numbers or email addresses here.',
  'bid.currentBid':'Current Bid','bid.timeLeft':'Time Remaining',
  'bid.yourBid':'Your Bid (USD)','bid.minBid':'Minimum increment: $10,000',
  'bid.proxyBid':'Proxy Bid / Max Bid (optional)',
  'bid.proxyHelper':'We\'ll bid automatically up to your maximum.',
  'bid.privacyNote':'All transactions are conducted exclusively through X Club.',
  'bid.cancel':'Cancel','bid.place':'Place Bid',
  'curator.title':'Contact Your Curator','curator.subtitle':'Our curators assist you personally — by phone, video call, or message.',
  'curator.callBtn':'Request a Call','curator.videoBtn':'Schedule Video Call',
  'curator.msgBtn':'Send a Message',
  'curator.hours':'Available Mon–Fri, 8:00–20:00 CET. Emergency assistance 24/7 for Private members.',
  'privacyModal.title':'Privacy Notice',
  'privacyModal.desc':'It appears you are attempting to share personal contact information. This violates the membership agreement.',
  'privacyModal.warning':'A violation may result in immediate suspension.',
  'privacyModal.understood':'Understood — Keep my message private',
  'success.title':'Application Received',
  'success.desc':'Thank you for your application. It will be carefully reviewed. You will receive a response within 5 business days.',
  'success.badge':'Reference: XC-2025-04811','success.btn':'Return to X Club',
  'a11y.title':'Accessibility','a11y.largerText':'Larger Text',
  'a11y.highContrast':'High Contrast','a11y.sound':'Sound Effects','a11y.needHelp':'Need help? Call a Curator',
  'auction.bidNow':'Bid Now','auction.watchlist':'Watch','auction.currentBid':'Current Bid',
  'auction.timeLeft':'Time Left','auction.bids':'Bids',
  'activity.bid':'Your bid is leading on','activity.match':'New AI match:',
  'activity.event':'RSVP confirmed:','activity.msg':'New message from','activity.concierge':'Concierge reply received',
  'match.connect':'Connect','match.view':'View Profile',
  'auth.login.title':'Welcome back','auth.login.sub':'Sign in to your X Club account',
  'auth.login.email':'Email','auth.login.password':'Password','auth.login.btn':'Sign In',
  'auth.login.forgot':'Forgot password?','auth.login.noAccount':'Not a member yet?','auth.login.apply':'Apply',
  'auth.login.google':'Continue with Google',
  'auth.register.title':'Create Account','auth.register.sub':'Begin your X Club journey',
  'auth.register.name':'Full Name','auth.register.btn':'Create Account','auth.register.have':'Already a member?',
  'auth.register.signin':'Sign In','auth.reset.title':'Reset Password','auth.reset.sub':'Enter your email to receive a reset link',
  'auth.reset.btn':'Send Reset Link','auth.reset.back':'Back to Sign In',
  'install.title':'Install X Club','install.body':'Add to your home screen for the best experience.',
  'install.btn':'Install','install.dismiss':'Dismiss',
  'push.title':'Stay Informed','push.body':'Enable notifications to receive bid updates, messages, and event reminders.',
  'push.allow':'Allow Notifications','push.skip':'Not now',
  'months.jan':'Jan','months.feb':'Feb','months.mar':'Mar','months.apr':'Apr',
  'months.may':'May','months.jun':'Jun','months.jul':'Jul','months.aug':'Aug',
  'months.sep':'Sep','months.oct':'Oct','months.nov':'Nov','months.dec':'Dec'
},

pt: {
  'nav.home':'Início','nav.membership':'Membros','nav.auctions':'Leilões',
  'nav.events':'Eventos','nav.dashboard':'Dashboard',
  'nav.memberArea':'Área de Membro','nav.applyForMembership':'Candidatar-se',
  'nav.memberLogin':'Entrar','nav.skipToContent':'Ir para o conteúdo',
  'hero.badge':'Candidaturas Abertas — 2025',
  'hero.title1':'Onde as personalidades','hero.title2':'mais distintas do mundo',
  'hero.title3':'se reúnem em privado.',
  'hero.subtitle':'X Club é uma adesão privada exclusiva por convite para indivíduos de alto patrimônio verificados.',
  'hero.ctaPrimary':'Solicitar Convite','hero.ctaSecondary':'Explorar Membros',
  'hero.stat1':'Membros Verificados','hero.stat2':'Ativos em Leilão',
  'hero.stat3':'Países Representados','hero.stat4':'Identidade Verificada','hero.scrollCue':'Descobrir',
  'features.eyebrow':'A Experiência','features.title':'Tudo o que esperaria.\nNada que encontrará em outro lugar.',
  'features.f1.title':'Privacidade Militar','features.f1.desc':'Comunicações com criptografia de ponta a ponta.',
  'features.f2.title':'Matching por IA','features.f2.desc':'O nosso algoritmo identifica oportunidades de co-investimento.',
  'features.f3.title':'Leilões de Luxo','features.f3.desc':'Lance em arte rara, relógios vintage e imóveis privados.',
  'features.f4.title':'Eventos Privados','features.f4.desc':'Cimeiras virtuais, jantares e mesas redondas de investimento.',
  'features.f5.title':'Concierge Pessoal','features.f5.desc':'O seu concierge trata de reservas, viagens e pedidos especiais.',
  'features.f6.title':'Salas de Negócios','features.f6.desc':'Salas de negócios privadas. Cofre de documentos, e-assinatura.',
  'testimonials.eyebrow':'Membros Falam','testimonials.title':'A maior recomendação\né a silenciosa.',
  'testimonials.t1.text':'O algoritmo de matching apresentou-me dois co-investidores no primeiro mês.',
  'testimonials.t1.name':'E. Hoffmann','testimonials.t1.role':'Private Equity, Frankfurt — Tier Privado',
  'testimonials.t2.text':'Tenho 74 anos e a equipa de onboarding acompanhou-me por telefone. Senti-me bem-vindo.',
  'testimonials.t2.name':'R. Castellanos','testimonials.t2.role':'Empresário Reformado, Miami — Tier Classic',
  'testimonials.t3.text':'Adquiri uma fração de um veleiro de 52m em leilão. O processo foi impecável.',
  'testimonials.t3.name':'A. Nkosi','testimonials.t3.role':'Fundador Tech, Londres — Tier Privado',
  'privacy.eyebrow':'Discrição Primeiro',
  'privacy.title':'A sua privacidade não é uma funcionalidade.\nÉ o alicerce.',
  'privacy.p1.title':'Criptografia E2E','privacy.p1.desc':'Todas as mensagens e documentos são encriptados.',
  'privacy.p2.title':'Moderação por IA','privacy.p2.desc':'A nossa IA interceta tentativas de partilhar contactos.',
  'privacy.p3.title':'Zero Partilha de Dados','privacy.p3.desc':'X Club nunca vende dados dos membros.',
  'cta.title':'Pronto para candidatar-se?','cta.desc':'Membros por candidatura. Respondemos em 5 dias úteis.',
  'cta.btn':'Iniciar Candidatura',
  'footer.tagline':'O clube digital privado mais exclusivo do mundo. Fund. 2024.',
  'footer.badge1':'Totalmente Encriptado','footer.badge2':'Conforme RGPD',
  'mem.classic.name':'Classic','mem.private.name':'Privado',
  'mem.classic.cta':'Candidatar-se ao Classic','mem.private.cta':'Solicitar Convite Privado',
  'bid.currentBid':'Lance Atual','bid.timeLeft':'Tempo Restante',
  'bid.yourBid':'O Seu Lance (USD)','bid.minBid':'Incremento mínimo: $10.000',
  'bid.cancel':'Cancelar','bid.place':'Efetuar Lance',
  'auction.bidNow':'Licitar','auction.watchlist':'Observar',
  'privacyModal.title':'Aviso de Privacidade',
  'privacyModal.desc':'Parece que está a tentar partilhar dados de contacto pessoais. Isso viola o acordo de membros.',
  'privacyModal.understood':'Entendido — Manter a minha mensagem privada',
  'success.title':'Candidatura Recebida','success.btn':'Regressar ao X Club',
  'a11y.title':'Acessibilidade','a11y.needHelp':'Ajuda? Contactar Curador',
  'auth.login.btn':'Entrar','auth.login.google':'Continuar com Google',
  'install.title':'Instalar X Club','install.btn':'Instalar','install.dismiss':'Dispensar',
  'months.jan':'Jan','months.feb':'Fev','months.mar':'Mar','months.apr':'Abr',
  'months.may':'Mai','months.jun':'Jun','months.jul':'Jul','months.aug':'Ago',
  'months.sep':'Set','months.oct':'Out','months.nov':'Nov','months.dec':'Dez'
},

es: {
  'nav.home':'Inicio','nav.membership':'Membresía','nav.auctions':'Subastas',
  'nav.events':'Eventos','nav.dashboard':'Panel',
  'nav.applyForMembership':'Solicitar Membresía','nav.memberLogin':'Iniciar Sesión',
  'hero.badge':'Solicitudes Abiertas — 2025',
  'hero.title1':'Donde las personalidades','hero.title2':'más distinguidas del mundo',
  'hero.title3':'se reúnen en privado.',
  'hero.ctaPrimary':'Solicitar Invitación','hero.ctaSecondary':'Explorar Membresía',
  'hero.stat1':'Miembros Verificados','hero.stat2':'Activos en Subasta',
  'hero.stat3':'Países Representados','hero.stat4':'Identidad Verificada','hero.scrollCue':'Descubrir',
  'features.f1.title':'Privacidad Militar','features.f2.title':'Matching por IA',
  'features.f3.title':'Subastas de Lujo','features.f4.title':'Eventos Privados',
  'features.f5.title':'Conserje Personal','features.f6.title':'Salas de Negocios',
  'privacy.p1.title':'Cifrado E2E','privacy.p2.title':'Moderación por IA','privacy.p3.title':'Cero Compartición',
  'bid.currentBid':'Oferta Actual','bid.timeLeft':'Tiempo Restante',
  'bid.yourBid':'Su Oferta (USD)','bid.cancel':'Cancelar','bid.place':'Realizar Oferta',
  'auction.bidNow':'Pujar','auction.watchlist':'Observar',
  'privacyModal.understood':'Entendido — Mantener mi mensaje privado',
  'success.title':'Solicitud Recibida','success.btn':'Volver a X Club',
  'a11y.needHelp':'¿Ayuda? Llamar al Curador',
  'auth.login.btn':'Iniciar Sesión','auth.login.google':'Continuar con Google',
  'install.btn':'Instalar','install.dismiss':'Descartar',
  'months.jan':'Ene','months.feb':'Feb','months.mar':'Mar','months.apr':'Abr',
  'months.may':'May','months.jun':'Jun','months.jul':'Jul','months.aug':'Ago',
  'months.sep':'Sep','months.oct':'Oct','months.nov':'Nov','months.dec':'Dic'
},

de: {
  'nav.home':'Startseite','nav.membership':'Mitgliedschaft','nav.auctions':'Auktionen',
  'nav.events':'Veranstaltungen','nav.dashboard':'Dashboard',
  'nav.applyForMembership':'Mitgliedschaft beantragen','nav.memberLogin':'Anmelden',
  'hero.badge':'Bewerbungen werden angenommen — 2025',
  'hero.title1':'Wo die angesehensten','hero.title2':'Persönlichkeiten der Welt',
  'hero.title3':'sich privat versammeln.',
  'hero.ctaPrimary':'Einladung anfordern','hero.ctaSecondary':'Mitgliedschaft erkunden',
  'hero.stat1':'Verifizierte Mitglieder','hero.stat2':'Assets in Auktion',
  'hero.stat3':'Vertretene Länder','hero.stat4':'Identität verifiziert','hero.scrollCue':'Entdecken',
  'features.f1.title':'Militärische Privatsphäre','features.f2.title':'KI-Matching',
  'features.f3.title':'Luxusauktionen','features.f4.title':'Private Veranstaltungen',
  'features.f5.title':'Persönlicher Concierge','features.f6.title':'Deal-Räume',
  'privacy.p1.title':'Ende-zu-Ende-Verschlüsselung','privacy.p2.title':'KI-Moderation',
  'privacy.p3.title':'Keine Datenweitergabe',
  'bid.currentBid':'Aktuelles Gebot','bid.timeLeft':'Verbleibende Zeit',
  'bid.yourBid':'Ihr Gebot (USD)','bid.cancel':'Abbrechen','bid.place':'Gebot abgeben',
  'auction.bidNow':'Bieten','auction.watchlist':'Beobachten',
  'privacyModal.understood':'Verstanden — Meine Nachricht privat halten',
  'success.title':'Bewerbung erhalten','success.btn':'Zurück zu X Club',
  'a11y.needHelp':'Hilfe? Kurator anrufen',
  'auth.login.btn':'Anmelden','auth.login.google':'Mit Google fortfahren',
  'install.btn':'Installieren','install.dismiss':'Schließen',
  'months.jan':'Jan','months.feb':'Feb','months.mar':'Mär','months.apr':'Apr',
  'months.may':'Mai','months.jun':'Jun','months.jul':'Jul','months.aug':'Aug',
  'months.sep':'Sep','months.oct':'Okt','months.nov':'Nov','months.dec':'Dez'
}
};

/* ══════════════════════════════════════════════════
   CORE STATE
══════════════════════════════════════════════════ */
let lang = 'en', soundOn = true, contrastOn = false, a11yOpen = false;
let currentAuction = null, activeConvId = 1;
let currentUser = null;
let _msgUnsubscribe = null;
let _notifUnsubscribe = null;

/* ══════════════════════════════════════════════════
   TRANSLATIONS
══════════════════════════════════════════════════ */
function tr(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
function applyT() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = tr(el.getAttribute('data-i18n'));
    if (v) el.textContent = v;
  });
}
function detectLang() {
  const n = (navigator.language || '').toLowerCase();
  if (n.startsWith('pt')) return 'pt';
  if (n.startsWith('es')) return 'es';
  if (n.startsWith('de')) return 'de';
  return 'en';
}
function setLanguage(l) {
  lang = l;
  document.documentElement.lang = l;
  const flags = { en:'🇺🇸', pt:'🇧🇷', es:'🇪🇸', de:'🇩🇪' };
  const codes  = { en:'EN',   pt:'PT',   es:'ES',   de:'DE'  };
  const fg = document.getElementById('currentLangFlag');
  const fc = document.getElementById('currentLangCode');
  if (fg) fg.textContent = flags[l] || '🇺🇸';
  if (fc) fc.textContent = codes[l] || 'EN';
  document.querySelectorAll('.lang-option').forEach((o, i) => {
    o.classList.toggle('active', ['en','pt','es','de'][i] === l);
  });
  const sel = document.getElementById('langSelector');
  if (sel) sel.classList.remove('open');
  applyT();
  renderAll();
  playClick();
  const msgs = { en:'Language changed to English', pt:'Idioma alterado para Português', es:'Idioma cambiado a Español', de:'Sprache auf Deutsch geändert' };
  showToast('🌐', '', msgs[l] || msgs.en, 2500);
}
function toggleLangMenu() {
  const s = document.getElementById('langSelector');
  if (s) s.classList.toggle('open');
}

/* ══════════════════════════════════════════════════
   SOUND ENGINE
══════════════════════════════════════════════════ */
let actx = null;
function getCtx() {
  if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) { return null; }
  return actx;
}
function tone(f, t, d, g, del = 0) {
  if (!soundOn) return;
  const c = getCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), gn = c.createGain();
    o.connect(gn); gn.connect(c.destination);
    o.type = t; o.frequency.setValueAtTime(f, c.currentTime + del);
    o.frequency.exponentialRampToValueAtTime(f * .6, c.currentTime + del + d * .8);
    gn.gain.setValueAtTime(0, c.currentTime + del);
    gn.gain.linearRampToValueAtTime(g, c.currentTime + del + .01);
    gn.gain.exponentialRampToValueAtTime(.001, c.currentTime + del + d);
    o.start(c.currentTime + del); o.stop(c.currentTime + del + d);
  } catch(_) {}
}
function playClick() {
  if (!soundOn) return;
  const c = getCtx(); if (!c) return;
  try {
    const b = c.createBuffer(1, c.sampleRate * .06, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * .008));
    const s = c.createBufferSource(), gn = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = .8;
    s.buffer = b; s.connect(f); f.connect(gn); gn.connect(c.destination);
    gn.gain.value = .18; s.start();
  } catch(_) {}
  tone(1800, 'sine', .06, .04);
}
function playNotification() { tone(523.25,'sine',.25,.06,0); tone(659.25,'sine',.25,.05,.1); tone(783.99,'sine',.35,.04,.2); }
function playBidSound()    { tone(698.46,'sine',.4,.07,0); tone(1046.5,'sine',.5,.04,.15); }
function playError()       { tone(440,'sine',.15,.05,0); tone(370,'sine',.2,.04,.12); }

/* ══════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════ */
function showPage(name) {
  /* Auth guard for protected pages */
  const protected_ = ['dashboard','messages','concierge','auctions','events'];
  if (protected_.includes(name) && !currentUser) { showPage('login'); return; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById('page-' + name);
  if (t) t.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const nm = { home:0, membership:1, auctions:2, events:3, dashboard:4 };
  const links = document.querySelectorAll('.nav-links a');
  if (nm[name] !== undefined && links[nm[name]]) links[nm[name]].classList.add('active');
  const nl = document.getElementById('navLinks');
  if (nl) nl.classList.remove('open');
  if (name === 'auctions')  renderAuctions();
  if (name === 'events')    { renderEvents(); renderCalendar(); }
  if (name === 'dashboard') renderDashboard();
  if (name === 'messages')  { renderMessages(); subscribeMessages(); }
  if (name === 'concierge') renderConcierge();
  /* Update URL param without reload */
  history.replaceState(null, '', '?page=' + name);
}
function toggleMobileNav() {
  const nl = document.getElementById('navLinks');
  if (nl) nl.classList.toggle('open');
}

/* ══════════════════════════════════════════════════
   DASHBOARD VIEWS
══════════════════════════════════════════════════ */
function showDashView(v, el) {
  ['overview','network','dealrooms','vault','matching','settings'].forEach(n => {
    const d = document.getElementById('dash-view-' + n);
    if (d) d.style.display = n === v ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
}

/* ══════════════════════════════════════════════════
   TOASTS
══════════════════════════════════════════════════ */
function showToast(icon, title, msg, dur = 4000) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-content">${title ? `<div class="toast-title">${title}</div>` : ''}<div class="toast-msg">${msg}</div></div><button class="toast-close" onclick="dismissToast(this.parentElement)">✕</button>`;
  c.appendChild(t);
  setTimeout(() => dismissToast(t), dur);
}
function dismissToast(t) {
  if (!t || !t.parentElement) return;
  t.classList.add('out');
  setTimeout(() => t.remove(), 380);
}

/* ══════════════════════════════════════════════════
   AUTH UI
══════════════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const btn   = document.getElementById('loginBtn');
  if (!email || !pass) { playError(); showToast('⚠️','','Please fill in all fields.'); return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    await window.XFire.signIn(email, pass);
    playNotification();
  } catch(err) {
    playError();
    showToast('⚠️', 'Sign In Failed', friendlyAuthError(err.code));
    btn.disabled = false; btn.textContent = tr('auth.login.btn');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPassword').value;
  const btn   = document.getElementById('regBtn');
  if (!name || !email || !pass) { playError(); showToast('⚠️','','Please fill in all fields.'); return; }
  if (pass.length < 8) { playError(); showToast('⚠️','','Password must be at least 8 characters.'); return; }
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    await window.XFire.signUp(email, pass, name);
    playNotification();
  } catch(err) {
    playError();
    showToast('⚠️', 'Registration Failed', friendlyAuthError(err.code));
    btn.disabled = false; btn.textContent = tr('auth.register.btn');
  }
}

async function handleGoogleLogin() {
  try {
    await window.XFire.signInGoogle();
    playNotification();
  } catch(err) {
    playError();
    showToast('⚠️', 'Google Sign-In Failed', friendlyAuthError(err.code));
  }
}

async function handleForgotPassword() {
  const email = document.getElementById('resetEmail').value.trim();
  if (!email) { playError(); showToast('⚠️','','Please enter your email.'); return; }
  try {
    await window.XFire.resetPassword(email);
    showToast('✅','','Password reset link sent. Check your email.');
    showPage('login');
  } catch(err) {
    playError(); showToast('⚠️','',friendlyAuthError(err.code));
  }
}

async function handleSignOut() {
  try {
    await window.XFire.signOut();
    currentUser = null;
    showPage('home');
    showToast('👋','','You have signed out.');
  } catch(err) {
    showToast('⚠️','','Sign out failed.');
  }
}

function friendlyAuthError(code) {
  const m = {
    'auth/user-not-found':   'No account found with that email.',
    'auth/wrong-password':   'Incorrect password.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password':    'Password is too weak.',
    'auth/invalid-email':    'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.'
  };
  return m[code] || 'An error occurred. Please try again.';
}

function onAuthStateChange(user) {
  currentUser = user;
  

  if (user) {
    /* Signed in */
    updateNavForUser(user);
    

    /* Subscribe to notifications */
    if (_notifUnsubscribe) _notifUnsubscribe();
    _notifUnsubscribe = window.XFire.watchNotifications(user.uid, notifs => {
      const unread = notifs.filter(n => !n.read).length;
      const badge = document.getElementById('notifBadge');
      if (badge) { badge.textContent = unread || ''; badge.style.display = unread ? 'flex' : 'none'; }
    });

    /* Check URL page param */
    const urlPage = new URLSearchParams(location.search).get('page');
    if (urlPage) showPage(urlPage);
    else showPage('dashboard');

    /* Offer push notifications (once) */
    if (!sessionStorage.getItem('xclub_push_offered')) {
      sessionStorage.setItem('xclub_push_offered', '1');
      setTimeout(() => showPushPrompt(), 3000);
    }
  } else {
    /* Not signed in */
    updateNavForGuest();
    
    const urlPage = new URLSearchParams(location.search).get('page');
    if (urlPage && ['login','register','home','membership'].includes(urlPage)) showPage(urlPage);
    else showPage('home');
  }
}

function updateNavForUser(user) {
  const apply  = document.getElementById('navApply');
  const login  = document.getElementById('navLogin');
  const dash   = document.getElementById('navDash');
  const uname  = document.getElementById('navUserName');
  if (apply) apply.style.display = 'none';
  if (login) login.style.display = 'none';
  if (dash)  dash.style.display  = 'inline-flex';
  if (uname) uname.textContent   = user.displayName?.split(' ')[0] || 'Member';
}

function updateNavForGuest() {
  const apply = document.getElementById('navApply');
  const login = document.getElementById('navLogin');
  const dash  = document.getElementById('navDash');
  if (apply) apply.style.display = 'inline-flex';
  if (login) login.style.display = 'inline-flex';
  if (dash)  dash.style.display  = 'none';
}

/* ══════════════════════════════════════════════════
   AUCTION DATA & RENDERING
══════════════════════════════════════════════════ */
const AUCTIONS_DATA = [
  { id:1, emoji:'🎨', category:'Fine Art', bid:'$1,240,000', time:'23:14:08', bids:18, prog:62, tier:'private',
    title:{ en:'Abstract Composition No. 7', pt:'Composição Abstrata N.º 7', es:'Composición Abstracta N.° 7', de:'Abstrakte Komposition Nr. 7' },
    desc: { en:'Oil on canvas, 1962. Christie\'s authenticated. Provenance verified.', pt:'Óleo sobre tela, 1962. Autenticado pela Christie\'s.', es:'Óleo sobre lienzo, 1962. Autenticado por Christie\'s.', de:'Öl auf Leinwand, 1962. Christie\'s-authentifiziert.' } },
  { id:2, emoji:'⌚', category:'Timepieces', bid:'$3,800,000', time:'47:02:33', bids:31, prog:41, tier:'private',
    title:{ en:'Patek Philippe Ref. 2499/100', pt:'Patek Philippe Ref. 2499/100', es:'Patek Philippe Ref. 2499/100', de:'Patek Philippe Ref. 2499/100' },
    desc: { en:'Rose gold perpetual calendar, 1960. Original box and papers.', pt:'Calendário perpétuo em ouro rosa, 1960.', es:'Calendario perpetuo en oro rosa, 1960.', de:'Ewiger Kalender Roségold, 1960. Originalbox.' } },
  { id:3, emoji:'⛵', category:'Marine', bid:'$620,000', time:'11:45:00', bids:9, prog:78, tier:'all',
    title:{ en:'Fractional Share: 52m Sailing Yacht', pt:'Fração: Veleiro de 52m', es:'Participación: Velero 52m', de:'Bruchteilsanteil: 52m Segelyacht' },
    desc: { en:'1/8 ownership of 2021 custom yacht. Berthed in Palma de Mallorca.', pt:'Propriedade 1/8 de iate 2021. Atracado em Palma de Maiorca.', es:'Propiedad 1/8 de velero 2021.', de:'1/8-Eigentum. Liegeplatz in Palma de Mallorca.' } },
  { id:4, emoji:'🏛️', category:'Real Estate', bid:'$12,500,000', time:'6d 14:00', bids:5, prog:22, tier:'private',
    title:{ en:'Villa Cala — Côte d\'Azur', pt:'Villa Cala — Costa Azul', es:'Villa Cala — Costa Azul', de:'Villa Cala — Côte d\'Azur' },
    desc: { en:'Six-bedroom villa, Cap d\'Antibes. 1,400m² habitable. Direct sea access.', pt:'Villa de seis quartos, Cap d\'Antibes. 1.400m².', es:'Villa de seis dormitorios, Cap d\'Antibes.', de:'Sechsschlafzimmer-Villa, Cap d\'Antibes.' } },
  { id:5, emoji:'🚀', category:'Experiences', bid:'$480,000', time:'2d 08:12', bids:7, prog:55, tier:'all',
    title:{ en:'Private Space Flight — Suborbital', pt:'Voo Espacial Privado — Suborbital', es:'Vuelo Espacial Privado', de:'Privater Weltraumflug — Suborbit' },
    desc: { en:'One seat aboard certified suborbital flight. Includes training programme.', pt:'Um lugar num voo suborbital. Inclui programa de treino.', es:'Un asiento en vuelo suborbital.', de:'Ein Sitzplatz im Suborbitalen Flug.' } },
  { id:6, emoji:'💎', category:'Jewellery', bid:'$2,100,000', time:'38:00:00', bids:14, prog:37, tier:'all',
    title:{ en:'The Indra Diamond — 14.8ct', pt:'O Diamante Indra — 14,8ct', es:'El Diamante Indra — 14,8ct', de:'Der Indra-Diamant — 14,8ct' },
    desc: { en:'Flawless D-colour Type IIa. GIA certified. Custom setting service included.', pt:'D-colour Type IIa impecável. Certificado GIA.', es:'D-colour Type IIa impecable. Certificado GIA.', de:'Makellose D-Farbe Type IIa. GIA-zertifiziert.' } }
];

let activeFilter = 'all';

function renderAuctions() {
  const g = document.getElementById('auctionGrid');
  if (!g) return;
  const filtered = activeFilter === 'all' ? AUCTIONS_DATA : AUCTIONS_DATA.filter(a => a.category.toLowerCase().includes(activeFilter));
  g.innerHTML = filtered.map(a => `
    <div class="auction-card">
      <div class="auction-img"><span>${a.emoji}</span></div>
      <div class="auction-body">
        <div class="auction-cats">
          <span class="badge badge-${a.tier==='private'?'gold':'silver'}">${a.category}</span>
          ${a.tier==='private' ? `<span class="badge badge-gold" style="font-size:.52rem">Private Tier</span>` : ''}
        </div>
        <div class="auction-title">${a.title[lang] || a.title.en}</div>
        <div class="auction-desc">${a.desc[lang] || a.desc.en}</div>
        <div class="auction-bid-row">
          <div><div class="auction-bid-label">${tr('auction.currentBid')}</div><div class="auction-bid-amount">${a.bid}</div></div>
          <div class="auction-timer"><div class="auction-bid-label">${tr('auction.timeLeft')}</div><div class="auction-timer-val">${a.time}</div></div>
        </div>
        <div class="auction-progress"><div class="auction-progress-bar" style="width:${a.prog}%"></div></div>
        <div class="auction-actions">
          <button class="btn btn-gold btn-sm" style="flex:1" onclick="playClick();openBidModal(${a.id})">${tr('auction.bidNow')}</button>
          <button class="btn btn-ghost btn-sm" onclick="playClick()">${tr('auction.watchlist')}</button>
        </div>
      </div>
    </div>`).join('');
}

function filterAuctions(category, btn) {
  activeFilter = category;
  playClick();
  document.querySelectorAll('.auction-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAuctions();
}

/* ══════════════════════════════════════════════════
   BID MODAL
══════════════════════════════════════════════════ */
function openBidModal(id) {
  if (!currentUser) { showPage('login'); return; }
  const a = AUCTIONS_DATA.find(x => x.id === id);
  if (!a) return;
  currentAuction = a;
  const bdg = document.getElementById('bidItemBadge');
  const dsc = document.getElementById('bidModalDesc');
  const cur = document.getElementById('bidCurrentAmt');
  const tl  = document.getElementById('bidTimeLeft');
  if (bdg) bdg.textContent = a.category;
  if (dsc) dsc.textContent = a.desc[lang] || a.desc.en;
  if (cur) cur.textContent = a.bid;
  if (tl)  tl.textContent  = a.time;
  document.getElementById('bidModal').classList.add('open');
  playClick();
}
function closeBidModal() { document.getElementById('bidModal').classList.remove('open'); }

async function placeBid() {
  const amt = document.getElementById('bidAmount').value;
  if (!amt || isNaN(amt) || Number(amt) <= 0) { playError(); showToast('⚠️', '', tr('bid.minBid')); return; }
  try {
    if (window.XFire && currentUser && currentAuction) {
      await window.XFire.placeBid(currentAuction.id, Number(amt));
    }
    closeBidModal(); playBidSound();
    showToast('✅', currentAuction ? (currentAuction.title[lang] || currentAuction.title.en) : '', `Bid of $${Number(amt).toLocaleString()} placed.`);
  } catch(err) {
    playError();
    showToast('⚠️', 'Bid Failed', err.message || 'Could not place bid.');
  }
}

/* ══════════════════════════════════════════════════
   EVENTS
══════════════════════════════════════════════════ */
const EVENTS_DATA = [
  { day:18, month:'Jan', seats:24, tier:'private',
    title: { en:'Global Alternative Assets Roundtable', pt:'Mesa Redonda Global de Ativos Alternativos', es:'Mesa Redonda Global de Activos Alternativos', de:'Globaler Roundtable für Alternative Assets' },
    fmt:   { en:'Virtual — Encrypted', pt:'Virtual — Encriptado', es:'Virtual — Cifrado', de:'Virtuell — Verschlüsselt' }, time:'15:00 CET' },
  { day:24, month:'Jan', seats:6, tier:'all',
    title: { en:'Members\' Dinner — Monaco', pt:'Jantar de Membros — Mónaco', es:'Cena de Miembros — Mónaco', de:'Mitglieder-Dinner — Monaco' },
    fmt:   { en:'In-Person', pt:'Presencial', es:'Presencial', de:'Persönlich' }, time:'20:00 CET' },
  { day:31, month:'Jan', seats:60, tier:'all',
    title: { en:'Art Acquisition Masterclass', pt:'Masterclass de Aquisição de Arte', es:'Masterclass de Adquisición de Arte', de:'Masterclass Kunstankauf' },
    fmt:   { en:'Virtual — Encrypted', pt:'Virtual — Encriptado', es:'Virtual — Cifrado', de:'Virtuell — Verschlüsselt' }, time:'17:00 GMT' },
  { day:7, month:'Feb', seats:40, tier:'all',
    title: { en:'Private Technology Summit', pt:'Cimeira Privada de Tecnologia', es:'Cumbre Privada de Tecnología', de:'Privater Technologie-Gipfel' },
    fmt:   { en:'Virtual — Encrypted', pt:'Virtual — Encriptado', es:'Virtual — Cifrado', de:'Virtuell — Verschlüsselt' }, time:'18:00 EST' },
  { day:14, month:'Feb', seats:12, tier:'private',
    title: { en:'Syndicate Workshop — Real Estate', pt:'Workshop de Sindicato — Imobiliário', es:'Taller de Sindicato — Inmuebles', de:'Syndikat-Workshop — Immobilien' },
    fmt:   { en:'Virtual — Encrypted', pt:'Virtual — Encriptado', es:'Virtual — Cifrado', de:'Virtuell — Verschlüsselt' }, time:'14:00 CET' },
  { day:22, month:'Feb', seats:30, tier:'all',
    title: { en:'Members\' Evening — Dubai', pt:'Noite de Membros — Dubai', es:'Velada de Miembros — Dubái', de:'Mitgliederabend — Dubai' },
    fmt:   { en:'In-Person', pt:'Presencial', es:'Presencial', de:'Persönlich' }, time:'19:30 GST' }
];

function renderEvents() {
  const l = document.getElementById('eventsList');
  if (!l) return;
  const sw = { en:'seats', pt:'lugares', es:'asientos', de:'Plätze' };
  l.innerHTML = EVENTS_DATA.map(ev => `
    <div class="event-card" onclick="playClick();rsvpEvent(${ev.day})">
      <div class="event-date-block"><div class="event-day">${ev.day}</div><div class="event-month">${ev.month}</div></div>
      <div class="event-info">
        <div class="event-title">${ev.title[lang] || ev.title.en}</div>
        <div style="margin-bottom:.5rem"><span class="badge badge-${ev.tier==='private'?'gold':'silver'}">${ev.tier==='private'?tr('mem.private.name'):'All Members'}</span></div>
        <div class="event-meta"><span>📍 ${ev.fmt[lang]||ev.fmt.en}</span><span>⏱ ${ev.time}</span><span>👥 ${ev.seats} ${sw[lang]||sw.en}</span></div>
      </div>
    </div>`).join('');
}

async function rsvpEvent(day) {
  if (!currentUser) { showPage('login'); return; }
  try {
    await window.XFire.rsvpEvent('event_jan_' + day);
    playNotification();
    showToast('📅', '', `RSVP confirmed for ${day} Jan event.`);
  } catch(_) {
    showToast('📅', '', 'RSVP noted.');
  }
}

let calDate = new Date(2025, 0, 1);
const evDays = [18, 24, 31];

function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const title = document.getElementById('calMonthTitle');
  if (!grid || !title) return;
  const mNames = {
    en:['January','February','March','April','May','June','July','August','September','October','November','December'],
    pt:['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    es:['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    de:['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  };
  const dNames = {
    en:['Su','Mo','Tu','We','Th','Fr','Sa'], pt:['Do','Se','Te','Qu','Qu','Se','Sa'],
    es:['Do','Lu','Ma','Mi','Ju','Vi','Sa'],  de:['So','Mo','Di','Mi','Do','Fr','Sa']
  };
  title.textContent = `${(mNames[lang]||mNames.en)[calDate.getMonth()]} ${calDate.getFullYear()}`;
  const fd  = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
  const dim = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  let h = (dNames[lang]||dNames.en).map(d => `<div class="mini-cal-day-label">${d}</div>`).join('');
  for (let i = 0; i < fd; i++) h += `<div class="mini-cal-day other-month"></div>`;
  for (let d = 1; d <= dim; d++) {
    const isT   = today.getDate()===d && today.getMonth()===calDate.getMonth() && today.getFullYear()===calDate.getFullYear();
    const hasEv = evDays.includes(d) && calDate.getMonth() === 0;
    h += `<div class="mini-cal-day${isT?' today':''}${hasEv?' has-event':''}" onclick="playClick()">${d}</div>`;
  }
  grid.innerHTML = h;
}
function changeMonth(dir) { calDate = new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1); renderCalendar(); }

/* ══════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════ */
function renderDashboard() {
  /* Personalise greeting with user name */
  const greet = document.getElementById('dashGreeting');
  if (greet && currentUser) {
    const name = currentUser.displayName?.split(' ')[0] || 'Member';
    const h    = new Date().getHours();
    const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    greet.textContent = `${salutation}, ${name}.`;
  }
  /* Update avatar */
  const av = document.getElementById('sidebarAvatar');
  if (av && currentUser?.photoURL) {
    av.innerHTML = `<img src="${window.XCloud ? window.XCloud.thumb(currentUser.photoURL, 88, 88) : currentUser.photoURL}" alt="Avatar">`;
  }
  const sn = document.getElementById('sidebarName');
  if (sn && currentUser) sn.textContent = currentUser.displayName || 'Member';
  renderActivity(); renderMatches(); renderBids();
}

function renderActivity() {
  const f = document.getElementById('activityFeed');
  if (!f) return;
  const items = [
    { icon:'🏺', text:`${tr('activity.bid')} <strong>Patek Philippe Ref. 2499</strong>`,    time:'2m' },
    { icon:'✨', text:`${tr('activity.match')} <strong>J. Reinholt</strong>`,               time:'18m' },
    { icon:'📅', text:`${tr('activity.event')} <strong>${EVENTS_DATA[0].title[lang]||EVENTS_DATA[0].title.en}</strong>`, time:'1h' },
    { icon:'💬', text:`${tr('activity.msg')} <strong>E. Hoffmann</strong>`,                 time:'3h' },
    { icon:'🎩', text:tr('activity.concierge'),                                             time:'5h' }
  ];
  f.innerHTML = items.map(i => `
    <div style="display:flex;gap:1rem;align-items:flex-start;padding:.75rem 0;border-bottom:1px solid rgba(212,175,55,.05)">
      <div style="width:34px;height:34px;border-radius:50%;background:rgba(212,175,55,.08);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">${i.icon}</div>
      <div style="flex:1"><div style="font-size:.82rem;line-height:1.5">${i.text}</div><div style="font-size:.68rem;color:var(--silver-dim);margin-top:.15rem">${i.time} ago</div></div>
    </div>`).join('');
}

function renderMatches() {
  const l = document.getElementById('matchesList');
  if (!l) return;
  const matches = [
    { e:'👤', name:'J. Reinholt', role:{ en:'Family Office · Hamburg', pt:'Family Office · Hamburgo', es:'Family Office · Hamburgo', de:'Family Office · Hamburg' }, score:94 },
    { e:'👤', name:'S. Al-Farsi', role:{ en:'Sovereign Wealth · Abu Dhabi', pt:'Fundo Soberano · Abu Dhabi', es:'Fondo Soberano · Abu Dabi', de:'Staatsfonds · Abu Dhabi' }, score:91 },
    { e:'👤', name:'M. Takahashi', role:{ en:'Private Equity · Tokyo', pt:'Capital Privado · Tóquio', es:'Capital Privado · Tokio', de:'Private Equity · Tokio' }, score:89 }
  ];
  l.innerHTML = matches.map(m => `
    <div style="display:flex;align-items:center;gap:1rem;padding:.9rem 0;border-bottom:1px solid rgba(212,175,55,.06)">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--navy-light);border:1px solid rgba(212,175,55,.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">${m.e}</div>
      <div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:500">${m.name}</div><div style="font-size:.72rem;color:var(--silver-dim)">${m.role[lang]||m.role.en}</div></div>
      <div style="text-align:right;flex-shrink:0;margin-right:.75rem"><div style="font-family:var(--font-display);font-size:1.1rem;color:var(--gold)">${m.score}%</div><div style="font-size:.6rem;color:var(--silver-dim)">match</div></div>
      <button class="btn btn-outline btn-sm" onclick="playClick()">${tr('match.connect')}</button>
    </div>`).join('');
}

function renderBids() {
  const l = document.getElementById('activeBidsList');
  if (!l) return;
  const bids = [
    { e:'⌚', n:'Patek Philippe Ref. 2499', bid:'$3,800,000', st:{ en:'Leading', pt:'A Liderar', es:'Liderando', de:'Führend' }, c:'var(--gold)' },
    { e:'🎨', n:'Abstract Comp. No. 7',    bid:'$1,240,000', st:{ en:'Leading', pt:'A Liderar', es:'Liderando', de:'Führend' }, c:'var(--gold)' },
    { e:'⛵', n:'Sailing Yacht Fraction',  bid:'$620,000',   st:{ en:'Outbid',  pt:'Superado',  es:'Superado',  de:'Überboten'}, c:'#e74c3c' }
  ];
  l.innerHTML = bids.map(b => `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 0;border-bottom:1px solid rgba(212,175,55,.06)">
      <div style="font-size:1.3rem;flex-shrink:0">${b.e}</div>
      <div style="flex:1;min-width:0"><div style="font-size:.78rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.n}</div><div style="font-size:.7rem;color:${b.c};font-weight:600">${b.st[lang]||b.st.en}</div></div>
      <div style="font-family:var(--font-display);font-size:.95rem;color:var(--gold);flex-shrink:0">${b.bid}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════ */
const CONVOS = [
  { id:1, e:'🏛️', name:'E. Hoffmann',
    preview:{ en:'The proposal looks excellent…', pt:'A proposta parece excelente…', es:'La propuesta parece excelente…', de:'Der Vorschlag sieht ausgezeichnet aus…' },
    time:'2m', unread:true },
  { id:2, e:'🎩', name:{ en:'Your Concierge', pt:'O Seu Concierge', es:'Su Conserje', de:'Ihr Concierge' },
    preview:{ en:'Your Monaco dinner is confirmed.', pt:'O seu jantar no Mónaco está confirmado.', es:'Su cena en Mónaco está confirmada.', de:'Ihr Monaco-Dinner ist bestätigt.' },
    time:'1h', unread:true },
  { id:3, e:'👤', name:'S. Al-Farsi',
    preview:{ en:'Very interested in co-investment…', pt:'Muito interessado no co-investimento…', es:'Muy interesado en co-inversión…', de:'Sehr interessiert am Co-Investment…' },
    time:'3h', unread:false },
  { id:4, e:'✨', name:{ en:'AI Matching', pt:'Correspondência IA', es:'Coincidencias IA', de:'KI-Matching' },
    preview:{ en:'5 new member matches ready.', pt:'5 novas correspondências prontas.', es:'5 nuevas coincidencias listas.', de:'5 neue Matches bereit.' },
    time:'Yesterday', unread:true }
];
const CHAT = [
  { from:'them', text:{ en:'Good afternoon. I reviewed your investment thesis on Southeast Asian logistics — very compelling.', pt:'Boa tarde. Revi a sua tese de investimento — muito convincente.', es:'Buenas tardes. Revisé su tesis de inversión — muy convincente.', de:'Guten Nachmittag. Ich habe Ihre Investitionsthese überprüft — sehr überzeugend.' } },
  { from:'me',   text:{ en:'Thank you. I\'ve been tracking this sector for three years. The infrastructure gaps are significant.', pt:'Obrigada. Acompanho este setor há três anos.', es:'Gracias. He seguido este sector durante tres años.', de:'Danke. Ich verfolge diesen Sektor seit drei Jahren.' } },
  { from:'them', text:{ en:'Agreed. I\'d like to explore a co-investment vehicle. Could we set up a deal room?', pt:'Concordo. Gostaria de explorar um veículo de co-investimento.', es:'De acuerdo. Me gustaría explorar un co-inversión.', de:'Einverstanden. Ich würde gerne ein Co-Investment erkunden.' } }
];

function renderMessages() {
  const li = document.getElementById('messageListItems');
  if (!li) return;
  li.innerHTML = CONVOS.map(c => `
    <div class="message-item ${c.id === activeConvId ? 'active' : ''}" onclick="selectConv(${c.id})">
      <div class="message-avatar">${c.e}</div>
      <div class="message-preview" style="flex:1;min-width:0">
        <div class="message-name">${typeof c.name === 'object' ? c.name[lang]||c.name.en : c.name}</div>
        <div class="message-snippet">${c.preview[lang]||c.preview.en}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <div class="message-time">${c.time}</div>
        ${c.unread ? '<div class="message-unread"></div>' : ''}
      </div>
    </div>`).join('');
  renderChat();
}

function selectConv(id) {
  activeConvId = id;
  const c = CONVOS.find(x => x.id === id);
  if (c) c.unread = false;
  playClick();
  renderMessages();
}

function renderChat() {
  const a = document.getElementById('chatArea');
  const n = document.getElementById('chatName');
  if (!a || !n) return;
  const c = CONVOS.find(x => x.id === activeConvId) || CONVOS[0];
  n.textContent = typeof c.name === 'object' ? c.name[lang]||c.name.en : c.name;
  a.innerHTML = CHAT.map(m => `<div class="chat-msg ${m.from}">${m.text[lang]||m.text.en}</div>`).join('');
  a.scrollTop = a.scrollHeight;
}

async function sendMessage() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;

  /* Privacy check */
  if (/\+?\d[\d\s\-\.]{7,}|@[a-z0-9]+\.|whatsapp|telegram|signal/i.test(msg)) {
    document.getElementById('privacyModal').classList.add('open');
    inp.value = ''; return;
  }

  CHAT.push({ from:'me', text:{ en:msg, pt:msg, es:msg, de:msg } });
  inp.value = ''; playClick(); renderChat();

  /* Persist to Firebase */
  if (window.XFire && currentUser) {
    window.XFire.sendMessage('conv_' + activeConvId, msg).catch(() => {});
  }

  /* Simulated reply */
  setTimeout(() => {
    const replies = {
      en:['Understood. Let me consider this carefully.','Interesting. I\'ll review and revert.','Agreed. Shall we proceed?'],
      pt:['Compreendo. Deixe-me considerar.','Interessante. Vou analisar.','Concordo. Prosseguimos?'],
      es:['Entiendo. Déjeme considerarlo.','Interesante. Lo revisaré.','De acuerdo. ¿Procedemos?'],
      de:['Ich verstehe. Lassen Sie mich das bedenken.','Interessant. Ich werde das prüfen.','Einverstanden. Sollen wir fortfahren?']
    };
    const arr = replies[lang] || replies.en;
    const r   = arr[Math.floor(Math.random() * arr.length)];
    CHAT.push({ from:'them', text:{ en:r, pt:r, es:r, de:r } });
    playNotification(); renderChat();
  }, 1200 + Math.random() * 800);
}

function handleChatKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

function subscribeMessages() {
  if (!currentUser || !window.XFire) return;
  if (_msgUnsubscribe) _msgUnsubscribe();
  _msgUnsubscribe = window.XFire.watchMessages('conv_' + activeConvId, msgs => {
    /* Merge live messages from Firebase (real members) — for now just triggers a re-render */
    renderChat();
  });
}

/* ══════════════════════════════════════════════════
   CONCIERGE
══════════════════════════════════════════════════ */
const CATS = [
  { e:'✈️', l:{ en:'Travel & Aviation', pt:'Viagens & Aviação', es:'Viajes & Aviación', de:'Reise & Luftfahrt' } },
  { e:'🍽️', l:{ en:'Dining & Hospitality', pt:'Gastronomia', es:'Gastronomía', de:'Gastronomie' } },
  { e:'🏠', l:{ en:'Accommodation', pt:'Alojamento', es:'Alojamiento', de:'Unterkunft' } },
  { e:'🎭', l:{ en:'Cultural Events', pt:'Eventos Culturais', es:'Eventos Culturales', de:'Kulturerlebnisse' } },
  { e:'⚕️', l:{ en:'Health & Wellness', pt:'Saúde & Bem-Estar', es:'Salud & Bienestar', de:'Gesundheit' } },
  { e:'📋', l:{ en:'Research & Advisory', pt:'Pesquisa & Consultoria', es:'Investigación', de:'Recherche' } },
  { e:'🎁', l:{ en:'Gifts & Gifting', pt:'Presentes', es:'Regalos', de:'Geschenke' } },
  { e:'🔐', l:{ en:'Security & Privacy', pt:'Segurança & Privacidade', es:'Seguridad & Privacidad', de:'Sicherheit' } },
  { e:'🌐', l:{ en:'Other Request', pt:'Outro Pedido', es:'Otra Solicitud', de:'Sonstiges' } }
];

function renderConcierge() {
  const el = document.getElementById('conciergeCategories');
  if (!el) return;
  el.innerHTML = CATS.map(c => `
    <div class="concierge-cat" onclick="playClick();selectCat(this)">
      <div class="concierge-cat-icon">${c.e}</div>
      <div class="concierge-cat-name">${c.l[lang]||c.l.en}</div>
    </div>`).join('');
}
function selectCat(el) {
  document.querySelectorAll('.concierge-cat').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

async function submitConcierge() {
  const req = document.getElementById('concRequest').value.trim();
  if (!req) { playError(); return; }
  if (/\+?\d[\d\s\-\.]{7,}|@[a-z0-9]+\.|whatsapp|telegram|signal/i.test(req)) {
    document.getElementById('privacyModal').classList.add('open'); return;
  }
  const urgency = document.getElementById('concUrgency').value;
  const cat = document.querySelector('.concierge-cat.selected .concierge-cat-name')?.textContent || 'Other';
  try {
    if (window.XFire && currentUser) {
      await window.XFire.submitConciergeRequest(cat, req, urgency);
    }
    playBidSound();
    showToast('🎩', tr('concierge.form.submit'), 'Request received. Your concierge will respond shortly.');
    document.getElementById('concRequest').value = '';
  } catch(err) {
    playError(); showToast('⚠️', '', err.message);
  }
}

/* ══════════════════════════════════════════════════
   ONBOARDING / APPLICATION
══════════════════════════════════════════════════ */
async function advanceOnboarding() {
  const fn = document.getElementById('appFirstName').value.trim();
  const ln = document.getElementById('appLastName').value.trim();
  if (!fn || !ln) { playError(); showToast('⚠️', '', 'Please fill in your name.'); return; }
  const tier    = document.getElementById('appTier').value;
  const country = document.getElementById('appCountry').value.trim();
  try {
    if (window.XFire) {
      await window.XFire.submitApplication({ firstName: fn, lastName: ln, tier, country, lang });
    }
    playNotification();
    document.getElementById('successModal').classList.add('open');
  } catch(_) {
    playNotification();
    document.getElementById('successModal').classList.add('open');
  }
}

/* ══════════════════════════════════════════════════
   PROFILE PHOTO UPLOAD
══════════════════════════════════════════════════ */
async function handlePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (!window.XCloud) { showToast('⚠️','','Cloudinary not loaded.'); return; }
  const preview   = document.getElementById('photoPreview');
  const bar       = document.getElementById('uploadProgressBar');
  const barWrap   = document.getElementById('uploadProgress');
  if (barWrap) barWrap.style.display = 'block';
  try {
    const result = await window.XCloud.upload(file, 'x_profiles', pct => {
      if (bar) bar.style.width = pct + '%';
    });
    if (preview) { preview.src = result.url; preview.style.display = 'block'; }
    if (window.XFire && currentUser) {
      await window.XFire.updateProfile(currentUser.uid, { photoURL: result.url });
    }
    showToast('✅','','Profile photo updated.');
  } catch(err) {
    playError(); showToast('⚠️','Upload failed', err.message);
  } finally {
    if (barWrap) barWrap.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════ */
function showCuratorModal()  { document.getElementById('curatorModal').classList.add('open'); playNotification(); }
function closeCuratorModal() { document.getElementById('curatorModal').classList.remove('open'); }
function closePrivacyModal() { document.getElementById('privacyModal').classList.remove('open'); }
function closeSuccessModal() { document.getElementById('successModal').classList.remove('open'); }
function closeBidModal2()    { closeBidModal(); }

/* ══════════════════════════════════════════════════
   ACCESSIBILITY
══════════════════════════════════════════════════ */
function toggleA11yPanel() {
  a11yOpen = !a11yOpen;
  document.getElementById('a11yPanel').classList.toggle('open', a11yOpen);
  document.getElementById('a11yBtn').classList.toggle('active', a11yOpen);
  document.getElementById('a11yBtn').setAttribute('aria-expanded', a11yOpen);
}
function toggleLargeFont() {
  const sizes = ['normal','large','xlarge'];
  const cur   = document.documentElement.getAttribute('data-fontsize') || 'normal';
  const next  = sizes[(sizes.indexOf(cur) + 1) % sizes.length];
  document.documentElement.setAttribute('data-fontsize', next);
  const t = document.getElementById('largeFontToggle');
  if (t) t.classList.toggle('on', next !== 'normal');
  if (next !== 'normal') playClick();
}
function toggleContrast() {
  contrastOn = !contrastOn;
  document.documentElement.setAttribute('data-contrast', contrastOn ? 'high' : 'normal');
  ['contrastToggle','a11yContrastToggle'].forEach(id => {
    const t = document.getElementById(id); if (t) t.classList.toggle('on', contrastOn);
  });
  if (contrastOn) playClick();
}
function toggleSound() {
  soundOn = !soundOn;
  ['soundToggle','a11ySoundToggle'].forEach(id => {
    const t = document.getElementById(id); if (t) t.classList.toggle('on', soundOn);
  });
  if (soundOn) setTimeout(playClick, 50);
}
function setFontSize(v) { document.documentElement.setAttribute('data-fontsize', v); }

/* ══════════════════════════════════════════════════
   HERO PARTICLES
══════════════════════════════════════════════════ */
function initParticles() {
  const cv = document.getElementById('hero-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = cv.width = cv.offsetWidth, H = cv.height = cv.offsetHeight;
  const pts = Array.from({ length: 55 }, () => ({
    x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+.3,
    vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3, a: Math.random()*.5+.1
  }));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) for (let j = i+1; j < pts.length; j++) {
      const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y, d = Math.sqrt(dx*dx+dy*dy);
      if (d < 120) {
        ctx.strokeStyle = `rgba(212,175,55,${(1-d/120)*.12})`; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(212,175,55,${p.a})`; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; }, { passive: true });
}

/* ══════════════════════════════════════════════════
   PWA — SERVICE WORKER & INSTALL
══════════════════════════════════════════════════ */
let deferredInstallPrompt = null;

function initPWA() {
  /* Register service worker */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[XClub SW] Registered:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔄','Update Available','Refresh to get the latest version of X Club.');
          }
        });
      });
    }).catch(err => console.warn('[XClub SW] Registration failed:', err));

    /* Messages from SW */
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'NAVIGATE') showPage(e.data.url.replace('/?page=',''));
      if (e.data?.type === 'SYNC_MESSAGES') renderMessages();
    });
  }

  /* Install prompt */
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('installBanner');
    if (banner && !localStorage.getItem('xclub_install_dismissed')) {
      setTimeout(() => banner.classList.add('show'), 5000);
    }
  });

  window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
    deferredInstallPrompt = null;
    showToast('✅','X Club Installed','You can now open X Club from your home screen.');
  });
}

async function promptInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') showToast('✅','','X Club installed successfully.');
  deferredInstallPrompt = null;
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('show');
}

function dismissInstall() {
  localStorage.setItem('xclub_install_dismissed','1');
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('show');
}

/* ══════════════════════════════════════════════════
   PUSH NOTIFICATIONS
══════════════════════════════════════════════════ */
function showPushPrompt() {
  if (Notification.permission !== 'default') return;
  const modal = document.getElementById('pushModal');
  if (modal) modal.classList.add('open');
}

async function allowPush() {
  document.getElementById('pushModal').classList.remove('open');
  const granted = await window.XFire.requestPushPermission();
  if (granted) {
    showToast('🔔','','Notifications enabled. You\'ll receive bid updates and messages.');
  }
}

function skipPush() {
  document.getElementById('pushModal').classList.remove('open');
}

/* ══════════════════════════════════════════════════
   RENDER ALL (on lang change)
══════════════════════════════════════════════════ */
function renderAll() {
  renderAuctions(); renderEvents(); renderCalendar();
  renderDashboard(); renderMessages(); renderConcierge();
}

/* ══════════════════════════════════════════════════
   KEYBOARD
══════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    const sel = document.getElementById('langSelector');
    if (sel) sel.classList.remove('open');
    if (a11yOpen) toggleA11yPanel();
  }
});

/* ══════════════════════════════════════════════════
   SCROLL NAV
══════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', scrollY > 20);
}, { passive: true });

/* Close lang dropdown on outside click */
document.addEventListener('click', e => {
  const s = document.getElementById('langSelector');
  if (s && !s.contains(e.target)) s.classList.remove('open');
});

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  /* Detect language */
  const dl = detectLang();
  lang = dl;
  document.documentElement.lang = dl;
  const flags = { en:'🇺🇸', pt:'🇧🇷', es:'🇪🇸', de:'🇩🇪' };
  const codes  = { en:'EN',   pt:'PT',   es:'ES',   de:'DE'  };
  const fg = document.getElementById('currentLangFlag');
  const fc = document.getElementById('currentLangCode');
  if (fg) fg.textContent = flags[dl];
  if (fc) fc.textContent = codes[dl];
  document.querySelectorAll('.lang-option').forEach((o,i) => o.classList.toggle('active', ['en','pt','es','de'][i] === dl));
  applyT();

  /* PWA */
  initPWA();
  initParticles();

  /* Load Firebase */
  try {
    await window.XFire.load();
    window.XFire.onAuthChange(user => {
      if (window.removeAppLoader) window.removeAppLoader();
      onAuthStateChange(user);
    });
  } catch(err) {
    console.error('[XClub] Firebase failed to load:', err);
    if (window.removeAppLoader) window.removeAppLoader();
    showPage('home');
    applyT(); renderAll(); initParticles();
  }

  /* Welcome toast (2s delay) */
  setTimeout(() => {
    playNotification();
    const msgs = { en:'Welcome to X Club. You have 5 new AI matches.', pt:'Bem-vindo ao X Club. Tem 5 novas correspondências por IA.', es:'Bienvenido a X Club. Tiene 5 nuevas coincidencias de IA.', de:'Willkommen bei X Club. Sie haben 5 neue KI-Matches.' };
    showToast('✨', 'X Club', msgs[dl] || msgs.en);
  }, 2500);

  /* Auction timer pulse */
  setInterval(() => {
    document.querySelectorAll('.auction-timer-val').forEach(el => {
      el.style.opacity = '.5';
      setTimeout(() => el.style.opacity = '1', 300);
    });
  }, 8000);
});
