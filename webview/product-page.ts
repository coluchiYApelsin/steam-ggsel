import {flightRecords,normalize,toOffer,type Offer} from './offers';
import {isProductUrl} from './merchant';
type Obj=Record<string,any>;
export type Product = {offer:Offer; description:string; additional:string; image?:string; sellerReviews?:number; positiveReviews?:number; fetchedAt:number};
function plain(value:unknown):string {
 if(typeof value!=='string')return '';
 // Parse inert markup and read text only; never attach merchant HTML to Steam.
 const doc=new DOMParser().parseFromString(value.replace(/<br\s*\/?\s*>|<\/p>/gi,'\n'),'text/html');
 doc.querySelectorAll('script,style,iframe,object').forEach(n=>n.remove());
 return (doc.body.textContent??'').trim();
}
// React Flight emits long descriptions as length-prefixed UTF-8 text records.
export function resolveProductText(html:string,value:unknown):string {
 if(typeof value!=='string')return '';
 if(!/^\$[a-f0-9]+$/i.test(value))return value;
 let stream='';
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){const match=m[1]!.trim().match(/^self\.__next_f\.push\((\[[\s\S]*\])\);?$/);if(!match)continue;try{const d=JSON.parse(match[1]!);if(d[0]===1&&typeof d[1]==='string')stream+=d[1];}catch{}}
 const record=new RegExp(`(?:^|\\n)${value.slice(1)}:T([a-f0-9]+),`,'i').exec(stream);
 if(!record)throw new Error('description_reference_unresolved');
 const length=parseInt(record[1]!,16),bytes=new TextEncoder().encode(stream.slice(record.index+record[0].length));
 if(!Number.isSafeInteger(length)||length>3000000||bytes.length<length)throw new Error('description_reference_invalid');
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(0,length));
}
export function verifiedProduct(html:string,expected:Offer,gameTitle:string,fetchedAt:number):Product {
 let detail:Obj|undefined;
 const walk=(v:unknown,depth=0)=>{if(!v||typeof v!=='object'||depth>45)return;const o=v as Obj;
  if(String(o.id_goods)===expected.id&&o.category&&o.seller&&Array.isArray(o.options))detail=o;
  Object.values(o).forEach(x=>walk(x,depth+1));};flightRecords(html).forEach(x=>walk(x));
 if(!detail||normalize(String(detail.baseCategory_name))!==normalize(gameTitle)||detail.category.platform!=='Steam'||normalize(String(detail.name))!==normalize(expected.title))throw new Error('identity_not_confirmed');
 const description=plain(resolveProductText(html,detail.info)),additional=plain(resolveProductText(html,detail.add_info));
 const region=description.match(/(?:region(?: of (?:use|activation))?|регион(?: активации)?)\s*:\s*([^\n]{2,160})/i)?.[1]?.trim();
 const slug=new URL(expected.url).pathname.split('/').pop()!;
 const offer=toOffer({...detail,url:slug,forbidden_type:detail.category.forbidden_type,content_type_id:detail.category.content_type_id,
  seller:{...detail.seller,rating:detail.seller.statistics?.rating},verified_region:region},gameTitle);
 if(!offer||offer.edition!==expected.edition||offer.kind!==expected.kind||(expected.sellerId?offer.sellerId!==expected.sellerId:normalize(offer.seller)!==normalize(expected.seller)))throw new Error('identity_not_confirmed');
 const edition=normalize(String(detail.category.edition??'')).replace(/ edition$/,'');
 if(edition!==offer.edition && !(offer.kind==='Аккаунт'&&offer.edition==='standard'&&!edition&&detail.category.content_type_id===1))throw new Error('edition_not_confirmed');
 offer.conditions=detail.options.map((o:Obj)=>[o.label,o.required?'Обязательный выбор':'',...(Array.isArray(o.variants)?o.variants.map((v:Obj)=>[v.text,v.modify,v.disabled?'Недоступно':''].filter(Boolean).join(' · ')):[]),o.comment].filter(x=>typeof x==='string'&&x.trim()).join('\n')).filter(Boolean);
 let image:string|undefined;
 try{const u=new URL(detail.images);if(u.protocol==='https:'&&u.hostname==='img.ggsel.net'&&!u.username&&!u.password&&!u.port)image=u.href;}catch{}
 const positive=detail.seller.statistics?.count_good_responses,negative=detail.seller.statistics?.count_bad_responses;
 const sellerReviews=Number.isSafeInteger(positive)&&positive>=0&&Number.isSafeInteger(negative)&&negative>=0?positive+negative:undefined;
 const positiveReviews=Number.isSafeInteger(detail.cnt_goodresponses)&&detail.cnt_goodresponses>=0?detail.cnt_goodresponses:undefined;
 return {offer,description,additional,image,sellerReviews,positiveReviews,fetchedAt};
}
const CSS=`
#ggsel-product-page{color:#c7d5e0;background:radial-gradient(ellipse at top,#29465b,#1b2838 65%);min-height:85vh;padding:64px 24px 64px;font:14px Arial,sans-serif;box-sizing:border-box}
#ggsel-product-page *{box-sizing:border-box}#ggsel-product-page .gp-content{max-width:940px;margin:auto}#ggsel-product-page h1{font-size:28px;font-weight:400;color:#fff;margin:22px 0}#ggsel-product-page h2{font-size:18px;font-weight:400;color:#fff;border-bottom:1px solid #405467;padding-bottom:10px}
#ggsel-product-page .gp-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px}#ggsel-product-page .gp-panel{padding:20px;background:rgba(0,0,0,.22);margin-bottom:20px;overflow-wrap:anywhere}#ggsel-product-page .gp-description{white-space:pre-wrap;line-height:1.65}#ggsel-product-page .gp-image{display:block;width:100%;max-height:340px;object-fit:contain;background:#16202d;padding:16px}#ggsel-product-page .gp-meta{white-space:pre-line;line-height:1.8;margin:12px 0;color:#acb2b8}#ggsel-product-page .gp-price{font-size:26px;color:#beee11;margin:18px 0}#ggsel-product-page .gp-notice{color:#a4d7f5;line-height:1.5}#ggsel-product-page button,#ggsel-product-page a{font:14px Arial,sans-serif;color:#d2efa9;border:0;padding:11px 16px;cursor:pointer;background:linear-gradient(90deg,#75b022,#588a1b);text-decoration:none;display:inline-block}#ggsel-product-page button:hover,#ggsel-product-page a:hover{filter:brightness(1.15)}#ggsel-product-page .gp-back{background:#29465b;color:#c7d5e0}#ggsel-product-page a:focus-visible,#ggsel-product-page button:focus-visible{outline:2px solid #66c0f4;outline-offset:3px}#ggsel-product-page .gp-checkout-notice{font-size:12px;line-height:1.6;color:#acb2b8;margin-top:12px}#ggsel-product-page .gp-origin{font-size:12px;color:#8f98a0;margin-top:20px}#ggsel-product-page .gp-error{padding:20px;border:1px solid #8b6045;margin-top:24px}
@media(max-width:700px){#ggsel-product-page{padding:64px 12px}#ggsel-product-page .gp-grid{grid-template-columns:1fr}#ggsel-product-page h1{font-size:23px}}
`;
const el=(tag:string,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
let cleanup:(()=>void)|undefined;
export function closeProductPage(){cleanup?.();}
export async function openProductPage(expected:Offer,appid:string,gameTitle:string,fetchDetail=(id:string,slug:string)=>backend.getGgselProduct(id,slug)) {
 if(!isProductUrl(expected.url)||!/^\d{1,10}$/.test(appid)||!location.pathname.startsWith(`/app/${appid}/`))throw new Error('invalid_product_context');
 closeProductPage();
 const container=document.querySelector('.responsive_page_template_content') as HTMLElement|null;
 if(!container)throw new Error('store_container_unavailable');
 const previousScroll=window.scrollY,previousUrl=location.href;
 const original=[...container.children].map(node=>({node:node as HTMLElement,hidden:(node as HTMLElement).hidden,display:(node as HTMLElement).style.getPropertyValue('display'),priority:(node as HTMLElement).style.getPropertyPriority('display')}));
 original.forEach(({node})=>{node.hidden=true;node.style.setProperty('display','none','important');});
 const page=el('main');page.id='ggsel-product-page';page.setAttribute('aria-label','Товар сторонней площадки GGSEL');
 const style=el('style');style.textContent=CSS;
 const content=el('div','gp-content'),back=el('button','gp-back','← Вернуться к игре Steam') as HTMLButtonElement;back.type='button';
 const heading=el('h1','',expected.title),notice=el('div','gp-notice','GGSEL — сторонняя площадка. Продавец и оплата не связаны с Valve.');
 const body=el('div');body.setAttribute('aria-live','polite');body.append(el('p','','Загрузка и проверка настоящей страницы товара…'));
 content.append(back,heading,notice,body);page.append(style,content);container.append(page);
 history.pushState({...history.state,steamGgselProduct:expected.id},'',`#ggsel-product-${expected.id}`);
 let active=true;
 const restore=()=>{if(!active)return;active=false;page.remove();original.forEach(({node,hidden,display,priority})=>{node.hidden=hidden;if(display)node.style.setProperty('display',display,priority);else node.style.removeProperty('display');});window.removeEventListener('popstate',onPop);clearInterval(routeCheck);if(cleanup===close)cleanup=undefined;if(location.pathname.startsWith(`/app/${appid}/`))window.scrollTo(0,previousScroll);};
 const onPop=()=>restore();
 const close=()=>{if(location.hash===`#ggsel-product-${expected.id}`){history.replaceState(history.state,'',previousUrl);}restore();};
 const routeCheck=setInterval(()=>{if(!location.pathname.startsWith(`/app/${appid}/`)||!page.isConnected)restore();},300);
 cleanup=close;back.onclick=()=>{history.back();restore();};window.addEventListener('popstate',onPop);window.scrollTo(0,0);back.focus({preventScroll:true});
 const load=async()=>{
  body.replaceChildren(el('p','','Загрузка и проверка настоящей страницы товара…'));
  try{
   const slug=new URL(expected.url).pathname.split('/').pop()!;
   const raw=await fetchDetail(expected.id,slug);const data=typeof raw==='string'?JSON.parse(raw):raw;
   if(!active)return;
   if(data?.status!=='ok'||typeof data.html!=='string'||typeof data.fetched_at!=='number')throw new Error('product_unavailable');
   const product=verifiedProduct(data.html,expected,gameTitle,data.fetched_at),o=product.offer;
   const grid=el('div','gp-grid'),left=el('div'),right=el('aside');
   if(product.image){const image=el('img','gp-image') as HTMLImageElement;image.src=product.image;image.alt=o.title;image.referrerPolicy='no-referrer';image.onerror=()=>image.replaceWith(el('p','','Изображение GGSEL недоступно'));left.append(image);}else left.append(el('p','','Изображение не предоставлено GGSEL'));
   const description=el('section','gp-panel');description.append(el('h2','','Описание товара'),el('div','gp-description',product.description||'Описание не предоставлено GGSEL'));left.append(description);
   if(product.additional){const extra=el('section','gp-panel');extra.append(el('h2','','Дополнительные условия'),el('div','gp-description',product.additional));left.append(extra);}
   const buy=el('section','gp-panel');buy.append(el('h2','','Предложение GGSEL'),el('div','gp-meta',`${o.kind} · ${o.edition.toUpperCase()}\n${o.region}`));
   buy.append(el('div','gp-price',`${o.priceFrom?'от ':''}${o.price.toLocaleString('ru-RU')} ₽`));
   if(o.conditions.length){const conditions=el('section','gp-panel');conditions.append(el('h2','','Регионы и условия вариантов'));o.conditions.forEach(c=>conditions.append(el('p','gp-meta',c)));left.append(conditions);}
   const pay=el('a','','Перейти к оформлению на GGSEL') as HTMLAnchorElement;pay.href=o.url;pay.target='_blank';pay.rel='noopener noreferrer';
   buy.append(pay,el('p','gp-checkout-notice','Следующий шаг откроет настоящий GGSEL во внешнем представлении браузера. Там вы самостоятельно выберете вариант, проверите итоговую цену и оформите заказ. Плагин не принимает оплату.'));
   const seller=el('section','gp-panel');seller.append(el('h2','','Продавец'),el('div','gp-meta',o.seller),el('div','gp-meta',o.sellerRating===undefined?'Рейтинг продавца не указан':`Рейтинг продавца: ${o.sellerRating.toFixed(1)} / 5`),el('div','gp-meta',product.sellerReviews===undefined?'Количество отзывов продавца не указано':`Отзывы продавца: ${product.sellerReviews}`),el('div','gp-meta',product.positiveReviews===undefined?'Отзывы о товаре не предоставлены':`Положительные отзывы о товаре: ${product.positiveReviews}`));
   right.append(buy,seller);grid.append(left,right);body.replaceChildren(grid,el('p','gp-origin',`Источник: GGSEL · товар ${o.id} · данные ${new Date(product.fetchedAt*1000).toLocaleString('ru-RU')}. Итоговая цена и доступность определяются площадкой.`));
  }catch(e){if(!active)return;const error=el('div','gp-error','Данные товара не подтверждены или GGSEL недоступен. Цена и оформление скрыты.');const retry=el('button','','Повторить') as HTMLButtonElement;retry.type='button';retry.onclick=()=>void load();body.replaceChildren(error,retry);console.warn('[Steam × GGSEL] product verification',e instanceof Error?e.message:'failed');}
 };await load();
}
