// Shared by every page: platforms, approval storage (Firestore, collection `approvals`), helpers.

// v=1: vertical video preview on a phone mockup; safe zones from the Ahdaf guideline (1080×1920 canvas, px)
const PLAT={
 tt:{n:'تيك توك',v:1,safe:{t:240,b:660,s:120}},
 ig:{n:'إنستقرام',v:1,safe:{t:270,b:670,s:65}},
 snap:{n:'سناب شات',v:1,safe:{t:225,b:495,s:65}},
 x:{n:'إكس',v:0},
 li:{n:'لينكدإن',v:0}};
const platNames=ps=>ps.map(p=>PLAT[p].n).join(' و');

const STATUS={ok:'معتمد',final:'تعميد نهائي',fix:'يحتاج تعديل',done:'تم التعديل',no:'غير معتمد'};

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

const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const fmt=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
const pad=i=>String(i).padStart(2,'0');
const qs=k=>new URLSearchParams(location.search).get(k);
const DL_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
// campaign.download is a URL template with {n}: item number (01, 02…) or a post's `dl` name
const dlUrl=(C,n)=>C.download?C.download.replace('{n}',n):'';

const meEl=document.getElementById('me');
if(meEl){try{meEl.value=localStorage.getItem('ahdaf-me')||localStorage.getItem('ahdaf-falcon-me')||''}catch(e){}
 meEl.oninput=()=>{try{localStorage.setItem('ahdaf-me',meEl.value)}catch(e){}}}
const me=()=>meEl?meEl.value.trim():'';
