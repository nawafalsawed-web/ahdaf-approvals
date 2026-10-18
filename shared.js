// Shared by every page: platforms, approval storage (Firestore, collection `approvals`), UI helpers.
// Needs icons.js loaded first.

// v=1: vertical video preview on a phone mockup; safe zones from the Ahdaf guideline (1080×1920 canvas, px)
const PLAT={
 tt:{n:'تيك توك',icon:'tiktok',v:1,safe:{t:240,b:660,s:120}},
 ig:{n:'إنستقرام',icon:'instagram',v:1,safe:{t:270,b:670,s:65}},
 snap:{n:'سناب شات',icon:'snapchat',v:1,safe:{t:225,b:495,s:65}},
 x:{n:'إكس',icon:'x-logo',v:0},
 li:{n:'لينكدإن',icon:'linkedin',v:0}};
const platNames=ps=>ps.map(p=>PLAT[p].n).join(' و');
const platIcons=ps=>ps.map(p=>`<span class="pi" title="${PLAT[p].n}">${ic(PLAT[p].icon)}</span>`).join('');

// review states. 'done' = we applied a requested edit and it waits for a new decision
const ST={ok:'معتمد',final:'تعميد نهائي',fix:'يحتاج تعديل',done:'تم التعديل',no:'غير معتمد'};
const isOk=v=>v==='ok'||v==='final';
const pill=v=>v&&ST[v]?`<span class="pill ${v}">${ST[v]}</span>`:'<span class="pill">بانتظار الرد</span>';

const FS='https://firestore.googleapis.com/v1/projects/ahdaf-influencers/databases/(default)/documents';
const DOCPATH=id=>`projects/ahdaf-influencers/databases/(default)/documents/approvals/${id}`;

// all approval docs of one campaign -> {itemId:{v,n,by}}
async function loadStates(slug){
 const r=await fetch(FS+':runQuery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{
  from:[{collectionId:'approvals'}],where:{fieldFilter:{field:{fieldPath:'c'},op:'EQUAL',value:{stringValue:slug}}}}})});
 if(!r.ok)throw new Error('load '+r.status);
 const out={};
 (await r.json()).forEach(x=>{if(!x.document)return;const f=x.document.fields;
  out[x.document.name.split('/').pop().split('__')[1]]={v:f.v?.stringValue||'',n:f.n?.stringValue||'',by:f.by?.stringValue||''}});
 return out;
}
function saveState(slug,id,s){
 return fetch(FS+':commit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({writes:[{
  update:{name:DOCPATH(`${slug}__${id}`),fields:{c:{stringValue:slug},v:{stringValue:s.v||''},n:{stringValue:(s.n||'').slice(0,1000)},by:{stringValue:(s.by||'').slice(0,40)}}},
  updateTransforms:[{fieldPath:'ts',setToServerValue:'REQUEST_TIME'}]}]})}).then(r=>{if(!r.ok)throw new Error('save '+r.status)});
}

// counts per state for a campaign's clips (cut clips count only if someone decided on them)
function tally(items,st){
 const t={ok:0,final:0,fix:0,no:0,done:0,none:0};
 items.forEach(c=>{const v=(st[c.i]||{}).v||'';t[v in t?v:'none']++});
 return t;
}
// the approval strip: one vertical frame per clip, colored by its state
function strip(items,st,big){
 return `<div class="strip${big?' big':''}" role="img" aria-label="حالة المقاطع">${items.map(c=>{const v=(st[c.i]||{}).v||'';
  return `<${big?'button':'i'} class="fr${v?' s-'+v:''}${c.cut&&!v?' cutx':''}" data-i="${c.i}" title="${pad(c.i)} · ${v?ST[v]:'بانتظار الرد'}"></${big?'button':'i'}>`}).join('')}</div>`;
}
function legend(t){
 return `<div class="legend">${[['ok','معتمد',t.ok+t.final],['fix','يحتاج تعديل',t.fix],['done','تم التعديل',t.done],['no','غير معتمد',t.no],['','بانتظار الرد',t.none]]
  .filter(([k,,n])=>n||k==='ok'||k==='').map(([k,l,n])=>`<span><i class="l-${k}"></i><b class="num">${n}</b> ${l}</span>`).join('')}</div>`;
}

const esc=t=>String(t??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const fmt=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
const pad=i=>typeof i==='number'?String(i).padStart(2,'0'):i;
const qs=k=>new URLSearchParams(location.search).get(k);
const one=t=>String(t||'').replace(/\n/g,' ');
// campaign.download is a URL template with {n}: item number (01, 02…) or a post's `dl` name
const dlUrl=(C,n)=>C.download?C.download.replace('{n}',n):'';

function toast(msg,icon='circle-check-big'){
 let el=document.querySelector('.toast'); if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
 el.innerHTML=ic(icon)+esc(msg); el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),2200);
}
function copyText(t,msg='انتسخ'){navigator.clipboard.writeText(t).then(()=>toast(msg,'copy'),()=>toast('ما قدرنا ننسخ، انسخه يدوياً','info'))}

function topbar(active,crumb){
 const h=document.createElement('header'); h.className='topbar';
 h.innerHTML=`<div class="wrap"><a class="logo" href="./" aria-label="أهداف"><img src="a/logo-purple.png" alt="أهداف"></a>
  ${active?`<nav><a href="./" class="${active==='home'?'on':''}">الحملات</a><a href="admin.html" class="${active==='admin'?'on':''}">إدارة</a></nav>`:''}
  <div class="sp"></div>${crumb?`<div class="crumb">${crumb}</div>`:''}</div>`;
 document.body.prepend(h);
}

// reviewer name, remembered per browser
const ME_KEY='ahdaf-me';
function getMe(){try{return localStorage.getItem(ME_KEY)||localStorage.getItem('ahdaf-falcon-me')||''}catch(e){return ''}}
function setMe(v){try{localStorage.setItem(ME_KEY,v)}catch(e){}}
