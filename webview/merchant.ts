import {PRODUCT_CSS} from './merchant-style';
const HOST='steam-ggsel-navigation';
const STATE='steam-ggsel-return-state';
export function isProductUrl(value:string):boolean {
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='ggsel.net'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/(?:en\/)?catalog\/product\/[a-z0-9-]+-\d+$/.test(u.pathname);}catch{return false;}
}
export async function openProduct(url:string,appid:string) {
 if(!isProductUrl(url)||!/^\d{1,10}$/.test(appid))throw new Error('invalid_product_url');
 const state={appid,scroll:window.scrollY,expanded:[...document.querySelectorAll('.ggsel-row')].filter(r=>r.querySelector('details[open]')).map(r=>(r as HTMLElement).dataset.offerId)};
 try{sessionStorage.setItem(STATE,JSON.stringify(state));}catch{}
 try{await Promise.race([backend.setMerchantContext(appid,state.scroll),new Promise(resolve=>setTimeout(resolve,2000))]);}catch{}
 // The current top-level Store WebView, not window.open(), an iframe or a popup.
 window.location.assign(url);
}
export function restoreSteamState(appid:string) {
 try{const raw=sessionStorage.getItem(STATE);if(!raw)return;const state=JSON.parse(raw);
  if(state.appid!==appid)return;
  for(const row of document.querySelectorAll('.ggsel-row')){const details=row.querySelector('details');if(details&&state.expanded?.includes((row as HTMLElement).dataset.offerId))details.open=true;}
  if(Number.isFinite(state.scroll)&&state.scroll>=0&&state.scroll<=100000){window.scrollTo(0,state.scroll);setTimeout(()=>{if(location.pathname.startsWith(`/app/${appid}/`))window.scrollTo(0,state.scroll);},250);}
  sessionStorage.removeItem(STATE);
 }catch{}
}
export async function startMerchantShell() {
 if(location.protocol!=='https:'||location.hostname!=='ggsel.net'||window.top!==window.self||document.getElementById(HOST))return;
 const host=document.createElement('div');host.id=HOST;
 // No document/form/input scraping, message forwarding, cookies, or network interception.
 const shadow=host.attachShadow({mode:'closed'});
 const style=document.createElement('style');style.textContent=`:host{display:block!important;position:fixed!important;inset:0 0 auto 0!important;z-index:2147483647!important;color:#c7d5e0;font:13px Arial,sans-serif}nav{min-height:48px;box-sizing:border-box;padding:8px 14px;background:#1b2838;border-bottom:1px solid #405467;display:flex;align-items:center;gap:10px;flex-wrap:wrap}button{border:1px solid #426078;background:#273c4d;color:#c7d5e0;padding:7px 12px;cursor:pointer}button:hover{background:#405467}span{flex:1;min-width:180px}small{color:#9aabba}button:focus-visible{outline:2px solid #66c0f4}`;
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Возврат из GGSEL в Steam');
 const back=document.createElement('button');back.textContent='Назад';back.type='button';back.onclick=()=>history.back();
 const label=document.createElement('span');label.textContent='GGSEL — сторонняя площадка, не Valve';
 const origin=document.createElement('small');origin.textContent='https://ggsel.net';
 const close=document.createElement('button');close.textContent='Закрыть · в Steam';close.type='button';
 let returnUrl='https://store.steampowered.com/';
 close.onclick=()=>location.assign(returnUrl);
 nav.append(back,label,origin,close);shadow.append(style,nav);document.documentElement.append(host);
 const padding=document.createElement('style');padding.id='steam-ggsel-shell-space';padding.textContent='html{scroll-padding-top:64px}body{padding-top:64px!important}';document.head.append(padding);
 const skin=document.createElement('style');skin.id='steam-ggsel-product-skin';skin.textContent=PRODUCT_CSS;document.head.append(skin);
 const updateRoute=()=>{const product=/^\/(?:en\/)?catalog\/product\/[a-z0-9-]+-\d+$/.test(location.pathname);skin.disabled=!product;
  if(product)document.documentElement.dataset.steamGgselProduct='true';else delete document.documentElement.dataset.steamGgselProduct;};
 updateRoute();window.setInterval(updateRoute,300);
 try{const raw=await backend.getMerchantContext();const ctx=typeof raw==='string'?JSON.parse(raw):raw;
  if(ctx&&typeof ctx==='object'&&'appid' in ctx&&/^\d{1,10}$/.test(String(ctx.appid))){returnUrl=`https://store.steampowered.com/app/${ctx.appid}/`;close.textContent='Закрыть · к игре';}
 }catch{close.textContent='Закрыть · в Steam';}
}
