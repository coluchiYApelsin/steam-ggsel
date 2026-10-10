import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {verifiedProduct,openProductPage,closeProductPage,resolveProductText} from '../webview/product-page';
import {productOffer} from '../webview/offers';
import {startWidget} from '../webview/preload';
const html=readFileSync(new URL('./fixtures/indiana-product.html',import.meta.url),'utf8');
const title='Indiana Jones and the Great Circle';
const expected=productOffer(html,{id_goods:102086349,url:'indiana-jones-and-the-great-circle-steam-kliuc-102086349'},title)!;
function setup(){const w=new Window({url:'https://store.steampowered.com/app/2677660/'});for(const key of ['document','location','window','history','DOMParser'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?w:(w as any)[key]});Object.defineProperty(globalThis,'backend',{configurable:true,value:{getGgselPrice:async()=>({status:'ok',data:{success:true,data:{count:1,amount:2103}},fetched_at:Math.floor(Date.now()/1000)}),getGgselProductFresh:async()=>({status:'ok',html,fetched_at:1}),getGgselReviews:async()=>({status:'ok',data:{success:true,data:[]}})}});return w;}

test('checkout rechecks price, asks for changed-price confirmation and fails closed on network errors',async()=>{
 const w=setup();w.document.body.innerHTML='<div class="responsive_page_template_content">Steam</div>';let calls=0,fail=false;
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{...backend,getGgselPrice:async()=>{calls++;return fail?{status:'network_error'}:{status:'ok',data:{success:true,data:{count:1,amount:calls===1?2103:2187}},fetched_at:Math.floor(Date.now()/1000)};}}});
 try{await openProductPage(expected,'2677660',title,async()=>({status:'ok',html,fetched_at:1}));expect(calls).toBe(1);
 (w.document.querySelector('.gp-continue') as any).click();await new Promise(r=>setTimeout(r,20));expect(calls).toBe(2);expect(w.document.querySelector('.gp-payment-link')).not.toBeNull();expect(w.document.querySelector('#ggsel-product-page')!.textContent).toContain('Цена изменилась');expect(w.location.hostname).toBe('store.steampowered.com');
 fail=true;(w.document.querySelector('.gp-continue') as any).click();await new Promise(r=>setTimeout(r,20));expect(w.document.querySelector('.gp-payment-link')).toBeNull();expect(w.document.querySelector('.gp-price')!.textContent).toBe('Цена требует уточнения');expect((w.document.querySelector('.gp-continue') as any).disabled).toBe(true);
 }finally{closeProductPage();w.happyDOM.abort();}
});

test('real edition selector invalidates old price, requotes IDs and remembers selection across return',async()=>{
 const w=setup();w.happyDOM.setURL('https://store.steampowered.com/app/1091500/');const fixture=readFileSync(new URL('./fixtures/configurable-5283641.html',import.meta.url),'utf8');const game='Cyberpunk 2077';
 const offer=productOffer(fixture,{id_goods:5283641,url:'cyberpunk-2077-vybor-izdaniia-vse-regiony-5283641'},game)!;
 w.document.body.innerHTML='<div class="responsive_page_template_content">Steam</div>';let seen:any;
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{...backend,getGgselProductFresh:async()=>({status:'ok',html:fixture,fetched_at:1}),getGgselPrice:async(id:string,raw:string)=>{seen=JSON.parse(raw);return {status:'ok',data:{success:true,data:{count:1,amount:seen['448562']==='1177048'?4380:2990}},fetched_at:Math.floor(Date.now()/1000)};}}});
 try{await openProductPage(offer,'1091500',game);const select=w.document.querySelector('[data-option-id="448562"]') as any;expect(select).not.toBeNull();select.value='1177048';select.dispatchEvent(new w.Event('change'));
 expect(w.document.querySelector('.gp-price')!.textContent).toBe('Цена требует уточнения');expect((w.document.querySelector('.gp-continue') as any).disabled).toBe(true);
 await new Promise(r=>setTimeout(r,460));expect(seen['448562']).toBe('1177048');expect(w.document.querySelector('.gp-price')!.textContent!.replace(/\s/g,'')).toBe('4380₽');expect(w.document.querySelector('iframe')).toBeNull();
 closeProductPage();await openProductPage(offer,'1091500',game);expect((w.document.querySelector('[data-option-id="448562"]') as any).value).toBe('1177048');
 }finally{closeProductPage();w.happyDOM.abort();}
});

test('changed server option schema blocks checkout before a new quote',async()=>{
 const w=setup();w.happyDOM.setURL('https://store.steampowered.com/app/1091500/');const fixture=readFileSync(new URL('./fixtures/configurable-5283641.html',import.meta.url),'utf8');const game='Cyberpunk 2077';
 const offer=productOffer(fixture,{id_goods:5283641,url:'cyberpunk-2077-vybor-izdaniia-vse-regiony-5283641'},game)!;
 w.document.body.innerHTML='<div class="responsive_page_template_content">Steam</div>';let calls=0,changed=false;
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{...backend,getGgselPrice:async()=>{calls++;return {status:'ok',data:{success:true,data:{count:1,amount:2990}},fetched_at:Math.floor(Date.now()/1000)};}}});
 try{await openProductPage(offer,'1091500',game,async()=>({status:'ok',html:changed?fixture.replaceAll('1177048','9999999'):fixture,fetched_at:1}));changed=true;
 (w.document.querySelector('.gp-continue') as any).click();await new Promise(r=>setTimeout(r,20));expect(calls).toBe(1);expect(w.document.querySelector('.gp-payment-link')).toBeNull();expect(w.document.querySelector('#ggsel-product-page')!.textContent).toContain('options_changed');expect(w.document.querySelector('.gp-price')!.textContent).toBe('Цена требует уточнения');
 }finally{closeProductPage();w.happyDOM.abort();}
});

test('handoff reports unknown payment status and stale detached confirmations cannot navigate',async()=>{
 const w=setup();w.document.body.innerHTML='<div class="responsive_page_template_content">Steam</div>';
 try{await openProductPage(expected,'2677660',title);(w.document.querySelector('.gp-continue') as any).click();await new Promise(r=>setTimeout(r,20));
 const link=w.document.querySelector('.gp-payment-link')!;expect(link.getAttribute('rel')).toBe('noopener noreferrer');
 const click=new w.MouseEvent('click',{cancelable:true});link.dispatchEvent(click);expect(click.defaultPrevented).toBe(false);expect(w.document.querySelector('.gp-checkout-status')!.textContent).toContain('Статус заказа и оплаты неизвестен');expect(w.document.querySelector('.gp-payment-link')).toBeNull();
 (w.document.querySelector('.gp-continue') as any).click();await new Promise(r=>setTimeout(r,20));const stale=w.document.querySelector('.gp-payment-link')!;closeProductPage();const oldClick=new w.MouseEvent('click',{cancelable:true});stale.dispatchEvent(oldClick);expect(oldClick.defaultPrevented).toBe(true);
 }finally{closeProductPage();w.happyDOM.abort();}
});
test('long Flight descriptions resolve UTF-8 byte lengths without executing merchant code',()=>{
 const text='<p>Регион: Россия / СНГ 🌎</p>';const record=`5c:T${new TextEncoder().encode(text).length.toString(16)},${text}\n6:{}`;
 const source=`<script>self.__next_f.push(${JSON.stringify([1,record])})</script>`;
 expect(resolveProductText(source,'$5c')).toBe(text);expect(()=>resolveProductText(source,'$7a')).toThrow('description_reference_unresolved');expect(resolveProductText(source,'Plain description')).toBe('Plain description');
});
test('product details use exact live identity, seller statistics and safe real image',()=>{
 const w=setup();try{const p=verifiedProduct(html,expected,title,1);expect(p.offer.price).toBe(2103);expect(p.sellerReviews).toBe(16936);expect(p.positiveReviews).toBe(8);expect(p.image).toStartWith('https://img.ggsel.net/');expect(p.description).toContain('RU/UA-CIS');expect(()=>verifiedProduct(html,{...expected,id:'1'},title,1)).toThrow('identity_not_confirmed');expect(()=>verifiedProduct(html,{...expected,kind:'Steam Gift'},title,1)).toThrow('identity_not_confirmed');expect(()=>verifiedProduct(html,{...expected,edition:'premium'},title,1)).toThrow();}finally{w.happyDOM.abort();}
});
test('native full page stays on Steam with no iframe or browser navigation and restores original nodes',async()=>{
 const w=setup();w.document.body.innerHTML='<header>Steam</header><div class="responsive_page_template_content"><section style="display:flex"><input value="preserved"><details open>Conditions</details></section></div>';
 const original=w.document.querySelector('section');try{await openProductPage(expected,'2677660',title,async()=>({status:'ok',html,fetched_at:1}));expect(w.location.hostname).toBe('store.steampowered.com');expect(w.location.hash).toBe('#ggsel-product-102086349');expect(w.document.querySelectorAll('#ggsel-product-page')).toHaveLength(1);expect(w.document.querySelectorAll('iframe')).toHaveLength(0);expect(w.document.querySelector('.gp-price')?.textContent?.replace(/\s/g,'')).toBe('2103₽');expect(w.document.querySelector('#ggsel-product-page a')).toBeNull();expect(w.document.querySelector('.gp-continue')?.hasAttribute('disabled')).toBe(false);closeProductPage();expect(w.location.hash).toBe('');expect(w.document.querySelector('section')).toBe(original);expect(original!.style.display).toBe('flex');expect(w.document.querySelector('details')?.open).toBe(true);expect(w.document.querySelector('input')?.value).toBe('preserved');}finally{closeProductPage();w.happyDOM.abort();}
});
test('unconfirmed product fails closed without checkout link or displayed price',async()=>{
 const w=setup();w.document.body.innerHTML='<div class="responsive_page_template_content"><div>Steam game</div></div>';try{await openProductPage(expected,'2677660',title,async()=>({status:'ok',html:html.replace('102086349','999999999'),fetched_at:1}));expect(w.document.querySelector('#ggsel-product-page a')).toBeNull();expect(w.document.querySelector('.gp-price')).toBeNull();expect(w.document.querySelector('.gp-error')).not.toBeNull();}finally{closeProductPage();w.happyDOM.abort();}
});
test('real offer button opens the native page and returns without an external browsing context',async()=>{
 const w=setup();Object.defineProperty(globalThis,'MutationObserver',{configurable:true,value:w.MutationObserver});
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{...backend,getGgselProduct:async()=>({status:'ok',html,fetched_at:1})}});
 const catalog=readFileSync(new URL('./fixtures/indiana-catalog.html',import.meta.url),'utf8');
 w.document.body.innerHTML=`<div class="responsive_page_template_content"><div class="apphub_AppName">${title}</div><div class="game_area_purchase_game"><h2>Купить ${title}</h2></div></div>`;
 const stop=startWidget(async()=>({status:'ok',html:catalog,catalog_title:title,fetched_at:Math.floor(Date.now()/1000)}));
 try{await new Promise(r=>setTimeout(r,300));const button=w.document.querySelector('.ggsel-buy');expect(button?.tagName).toBe('BUTTON');expect(button?.hasAttribute('href')).toBe(false);(button as any).click();await new Promise(r=>setTimeout(r,30));expect(w.location.hostname).toBe('store.steampowered.com');expect(w.document.querySelectorAll('#ggsel-product-page')).toHaveLength(1);expect(w.document.querySelector('.gp-price')).not.toBeNull();(w.document.querySelector('.gp-back') as any).click();expect(w.document.querySelector('#ggsel-product-page')).toBeNull();expect(w.document.querySelector('.ggsel-buy')).toBe(button);}finally{closeProductPage();stop();w.happyDOM.abort();}
});
