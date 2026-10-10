import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {verifiedProduct,openProductPage,closeProductPage,resolveProductText} from '../webview/product-page';
import {productOffer} from '../webview/offers';
import {startWidget} from '../webview/preload';
const html=readFileSync(new URL('./fixtures/indiana-product.html',import.meta.url),'utf8');
const title='Indiana Jones and the Great Circle';
const expected=productOffer(html,{id_goods:102086349,url:'indiana-jones-and-the-great-circle-steam-kliuc-102086349'},title)!;
function setup(){const w=new Window({url:'https://store.steampowered.com/app/2677660/'});for(const key of ['document','location','window','history','DOMParser'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?w:(w as any)[key]});return w;}
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
 const original=w.document.querySelector('section');try{await openProductPage(expected,'2677660',title,async()=>({status:'ok',html,fetched_at:1}));expect(w.location.hostname).toBe('store.steampowered.com');expect(w.location.hash).toBe('#ggsel-product-102086349');expect(w.document.querySelectorAll('#ggsel-product-page')).toHaveLength(1);expect(w.document.querySelectorAll('iframe')).toHaveLength(0);expect(w.document.querySelector('.gp-price')?.textContent?.replace(/\s/g,'')).toBe('2103₽');expect(w.document.querySelector('#ggsel-product-page a')?.getAttribute('href')).toBe(expected.url);expect(w.document.querySelector('#ggsel-product-page')?.textContent).toContain('Следующий шаг откроет настоящий GGSEL');closeProductPage();expect(w.location.hash).toBe('');expect(w.document.querySelector('section')).toBe(original);expect(original!.style.display).toBe('flex');expect(w.document.querySelector('details')?.open).toBe(true);expect(w.document.querySelector('input')?.value).toBe('preserved');}finally{closeProductPage();w.happyDOM.abort();}
});
test('unconfirmed product fails closed without checkout link or displayed price',async()=>{
 const w=setup();w.document.body.innerHTML='<div class="responsive_page_template_content"><div>Steam game</div></div>';try{await openProductPage(expected,'2677660',title,async()=>({status:'ok',html:html.replace('102086349','999999999'),fetched_at:1}));expect(w.document.querySelector('#ggsel-product-page a')).toBeNull();expect(w.document.querySelector('.gp-price')).toBeNull();expect(w.document.querySelector('.gp-error')).not.toBeNull();}finally{closeProductPage();w.happyDOM.abort();}
});
test('real offer button opens the native page and returns without an external browsing context',async()=>{
 const w=setup();Object.defineProperty(globalThis,'MutationObserver',{configurable:true,value:w.MutationObserver});
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{getGgselProduct:async()=>({status:'ok',html,fetched_at:1})}});
 const catalog=readFileSync(new URL('./fixtures/indiana-catalog.html',import.meta.url),'utf8');
 w.document.body.innerHTML=`<div class="responsive_page_template_content"><div class="apphub_AppName">${title}</div><div class="game_area_purchase_game"><h2>Купить ${title}</h2></div></div>`;
 const stop=startWidget(async()=>({status:'ok',html:catalog,catalog_title:title,fetched_at:Math.floor(Date.now()/1000)}));
 try{await new Promise(r=>setTimeout(r,300));const button=w.document.querySelector('.ggsel-buy');expect(button?.tagName).toBe('BUTTON');expect(button?.hasAttribute('href')).toBe(false);(button as any).click();await new Promise(r=>setTimeout(r,30));expect(w.location.hostname).toBe('store.steampowered.com');expect(w.document.querySelectorAll('#ggsel-product-page')).toHaveLength(1);expect(w.document.querySelector('.gp-price')).not.toBeNull();(w.document.querySelector('.gp-back') as any).click();expect(w.document.querySelector('#ggsel-product-page')).toBeNull();expect(w.document.querySelector('.ggsel-buy')).toBe(button);}finally{closeProductPage();stop();w.happyDOM.abort();}
});
