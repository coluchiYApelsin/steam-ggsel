import {flightRecords,normalize,toOffer,configurableOffer,variantEdition,type Offer} from './offers';
import {isProductUrl} from './merchant';
import {productOptions,defaultSelection,validateSelection,priceSelection,decodeQuote,selectionSummary,selectionProductUrl,type ProductOption,type Selection} from './options';
type Obj=Record<string,any>;
export type Product = {offer:Offer; description:string; additional:string; image?:string; sellerReviews?:number; positiveReviews?:number; fetchedAt:number;options:ProductOption[]};
export function productError(error:unknown):string{
 const key=error instanceof Error?error.message:String(error);const messages:Record<string,string>={network_error:'GGSEL временно недоступен.',http_error:'GGSEL отклонил запрос.',product_removed:'Товар удалён или больше недоступен.',product_unavailable:'Товар недоступен.',invalid_response:'Ответ GGSEL невозможно обработать.',unexpected_content_type:'GGSEL вернул ответ другого типа.',rate_limited:'Слишком частые запросы. Подождите минуту и повторите.',identity_not_confirmed:'Соответствие товара, игры или продавца не подтверждено.',edition_not_confirmed:'Издание не подтверждено.',combination_unavailable:'Выбранная комбинация недоступна по ответу GGSEL.',invalid_price_response:'GGSEL не подтвердил корректную цену этой комбинации.',unsupported_options:'Формат параметров товара не поддерживается.',sensitive_option:'Этот товар требует чувствительные данные. Заполняйте их только на GGSEL.',unsupported_quantity:'Товары с расчётом количества пока не поддерживаются.',selected_variant_unconfirmed:'Состав выбранного варианта недостаточно подтверждён.',description_reference_unresolved:'Не удалось прочитать описание GGSEL.',access_blocked:'GGSEL запросил проверку доступа. Защита не обходится.'};return messages[key]??(/^(Заполните:|Вариант недоступен:|Несовместимые параметры|Параметр слишком длинный)/.test(key)?key:'Данные товара не подтверждены.');
}
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
 if(!detail||normalize(String(detail.baseCategory_name))!==normalize(gameTitle)||detail.category.platform!=='Steam'||normalize(String(detail.name))!==normalize(expected.sourceTitle??expected.title))throw new Error('identity_not_confirmed');
 if(detail.is_active===false)throw new Error('product_unavailable');
 const description=plain(resolveProductText(html,detail.info)),additional=plain(resolveProductText(html,detail.add_info));
 const region=description.match(/(?:region(?: of (?:use|activation))?|регион(?: активации)?)\s*:\s*([^\n]{2,160})/i)?.[1]?.trim();
 const slug=new URL(expected.url).pathname.split('/').pop()!;
 const offer=expected.configurable?configurableOffer(detail,{id_goods:expected.id,url:slug},gameTitle):toOffer({...detail,url:slug,forbidden_type:detail.category.forbidden_type,content_type_id:detail.category.content_type_id,
  seller:{...detail.seller,rating:detail.seller.statistics?.rating},verified_region:region},gameTitle);
 if(!offer||offer.edition!==expected.edition||offer.kind!==expected.kind||(expected.sellerId?offer.sellerId!==expected.sellerId:normalize(offer.seller)!==normalize(expected.seller)))throw new Error('identity_not_confirmed');
 const edition=normalize(String(detail.category.edition??'')).replace(/ edition$/,'');
 if(!expected.configurable&&edition!==offer.edition && !(offer.kind==='Аккаунт'&&offer.edition==='standard'&&!edition&&detail.category.content_type_id===1))throw new Error('edition_not_confirmed');
 offer.conditions=detail.options.map((o:Obj)=>[o.label,o.required?'Обязательный выбор':'',...(Array.isArray(o.variants)?o.variants.map((v:Obj)=>[v.text,v.modify,v.disabled?'Недоступно':''].filter(Boolean).join(' · ')):[]),o.comment].filter(x=>typeof x==='string'&&x.trim()).join('\n')).filter(Boolean);
 let image:string|undefined;
 try{const u=new URL(detail.images);if(u.protocol==='https:'&&u.hostname==='img.ggsel.net'&&!u.username&&!u.password&&!u.port)image=u.href;}catch{}
 const positive=detail.seller.statistics?.count_good_responses,negative=detail.seller.statistics?.count_bad_responses;
 const sellerReviews=Number.isSafeInteger(positive)&&positive>=0&&Number.isSafeInteger(negative)&&negative>=0?positive+negative:undefined;
 const positiveReviews=Number.isSafeInteger(detail.cnt_goodresponses)&&detail.cnt_goodresponses>=0?detail.cnt_goodresponses:undefined;
 if(detail.prices_unit)throw new Error('unsupported_quantity');
 return {offer,description,additional,image,sellerReviews,positiveReviews,fetchedAt,options:productOptions(detail.options)};
}
const CSS=`
#ggsel-product-page{color:#c7d5e0;background:radial-gradient(ellipse at top,#29465b,#1b2838 65%);min-height:85vh;padding:64px 24px 64px;font:14px Arial,sans-serif;box-sizing:border-box}
#ggsel-product-page *{box-sizing:border-box}#ggsel-product-page .gp-content{max-width:940px;margin:auto}#ggsel-product-page h1{font-size:28px;font-weight:400;color:#fff;margin:22px 0}#ggsel-product-page h2{font-size:18px;font-weight:400;color:#fff;border-bottom:1px solid #405467;padding-bottom:10px}
#ggsel-product-page .gp-field{display:block;margin:16px 0;line-height:1.5}#ggsel-product-page select,#ggsel-product-page input:not([type=checkbox]),#ggsel-product-page textarea{display:block;width:100%;margin:8px 0;padding:10px;background:#16202d;border:1px solid #405467;color:#c7d5e0;font:14px Arial,sans-serif}#ggsel-product-page .gp-checkbox{display:block;margin:8px 0}#ggsel-product-page .gp-warning{color:#ffc97a;line-height:1.6}#ggsel-product-page button:disabled{opacity:.45;cursor:default}#ggsel-product-page .gp-review{border-bottom:1px solid #405467;padding:10px 0}#ggsel-product-page .gp-back{margin:4px 8px 4px 0}
#ggsel-product-page .gp-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px}#ggsel-product-page .gp-panel{padding:20px;background:rgba(0,0,0,.22);margin-bottom:20px;overflow-wrap:anywhere}#ggsel-product-page .gp-description{white-space:pre-wrap;line-height:1.65}#ggsel-product-page .gp-image{display:block;width:100%;max-height:340px;object-fit:contain;background:#16202d;padding:16px}#ggsel-product-page .gp-meta{white-space:pre-line;line-height:1.8;margin:12px 0;color:#acb2b8}#ggsel-product-page .gp-price{font-size:26px;color:#beee11;margin:18px 0}#ggsel-product-page .gp-notice{color:#a4d7f5;line-height:1.5}#ggsel-product-page button,#ggsel-product-page a{font:14px Arial,sans-serif;color:#d2efa9;border:0;padding:11px 16px;cursor:pointer;background:linear-gradient(90deg,#75b022,#588a1b);text-decoration:none;display:inline-block}#ggsel-product-page button:hover,#ggsel-product-page a:hover{filter:brightness(1.15)}#ggsel-product-page .gp-back{background:#29465b;color:#c7d5e0}#ggsel-product-page a:focus-visible,#ggsel-product-page button:focus-visible{outline:2px solid #66c0f4;outline-offset:3px}#ggsel-product-page .gp-checkout-notice{font-size:12px;line-height:1.6;color:#acb2b8;margin-top:12px}#ggsel-product-page .gp-origin{font-size:12px;color:#8f98a0;margin-top:20px}#ggsel-product-page .gp-error{padding:20px;border:1px solid #8b6045;margin-top:24px}
@media(max-width:700px){#ggsel-product-page{padding:64px 12px}#ggsel-product-page .gp-grid{grid-template-columns:1fr}#ggsel-product-page h1{font-size:23px}}
`;
const el=(tag:string,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
let cleanup:(()=>void)|undefined;
const savedSelections=new Map<string,Selection>();
export function closeProductPage(){cleanup?.();}
export async function openProductPage(expected:Offer,appid:string,gameTitle:string,fetchDetail=(id:string,slug:string)=>backend.getGgselProductFresh(id,slug)) {
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
 const dismiss=el('button','gp-back','Закрыть') as HTMLButtonElement;dismiss.type='button';
 const heading=el('h1','',expected.title),notice=el('div','gp-notice','GGSEL — сторонняя площадка. Продавец и оплата не связаны с Valve.');
 const body=el('div');body.setAttribute('aria-live','polite');body.append(el('p','','Загрузка и проверка настоящей страницы товара…'));
 content.append(back,dismiss,heading,notice,body);page.append(style,content);container.append(page);
 history.pushState({...history.state,steamGgselProduct:expected.id},'',`#ggsel-product-${expected.id}`);
 let active=true;
 const restore=()=>{if(!active)return;active=false;page.remove();original.forEach(({node,hidden,display,priority})=>{node.hidden=hidden;if(display)node.style.setProperty('display',display,priority);else node.style.removeProperty('display');});window.removeEventListener('popstate',onPop);clearInterval(routeCheck);if(cleanup===close)cleanup=undefined;if(location.pathname.startsWith(`/app/${appid}/`))window.scrollTo(0,previousScroll);};
 const onPop=()=>restore();
 const close=()=>{if(location.hash===`#ggsel-product-${expected.id}`){history.replaceState(history.state,'',previousUrl);}restore();};
 const routeCheck=setInterval(()=>{if(!location.pathname.startsWith(`/app/${appid}/`)||!page.isConnected)restore();},300);
 cleanup=close;dismiss.onclick=close;back.onclick=()=>{history.back();restore();};window.addEventListener('popstate',onPop);window.scrollTo(0,0);back.focus({preventScroll:true});
 let quoteGeneration=0;
 const load=async()=>{
  body.replaceChildren(el('p','','Загрузка и проверка настоящей страницы товара…'));
  try{
   const slug=new URL(expected.url).pathname.split('/').pop()!;
   const raw=await fetchDetail(expected.id,slug);const data=typeof raw==='string'?JSON.parse(raw):raw;
   if(!active)return;
   if(data?.status!=='ok')throw new Error(data?.status==='http_error'&&data.http_status===404?'product_removed':data?.status??'product_unavailable');
   if(typeof data.html!=='string'||typeof data.fetched_at!=='number')throw new Error('invalid_response');
   const product=verifiedProduct(data.html,expected,gameTitle,data.fetched_at),o=product.offer;
   const grid=el('div','gp-grid'),left=el('div'),right=el('aside');
   if(product.image){const image=el('img','gp-image') as HTMLImageElement;image.src=product.image;image.alt=o.title;image.referrerPolicy='no-referrer';image.onerror=()=>image.replaceWith(el('p','','Изображение GGSEL недоступно'));left.append(image);}else left.append(el('p','','Изображение не предоставлено GGSEL'));
   const description=el('section','gp-panel');description.append(el('h2','','Описание товара'),el('div','gp-description',product.description||'Описание не предоставлено GGSEL'));left.append(description);
   if(product.additional){const extra=el('section','gp-panel');extra.append(el('h2','','Дополнительные условия'),el('div','gp-description',product.additional));left.append(extra);}
   const buy=el('section','gp-panel'),variantMeta=el('div','gp-meta',`${o.kind} · ${o.edition.toUpperCase()}\n${o.region}`);buy.append(el('h2','','Предложение GGSEL'),variantMeta);
   const amount=el('div','gp-price','Цена требует уточнения'),quoteStatus=el('p','gp-meta');
   const selectionInfo=el('p','gp-meta');buy.append(selectionInfo,amount,quoteStatus);
   if(o.kind==='Аккаунт')buy.append(el('p','gp-warning','Вы получаете другой Steam-аккаунт. Игра не добавляется в вашу существующую библиотеку Steam. Условия передачи и риски указаны продавцом ниже.'));
   if(o.conditions.length){const conditions=el('section','gp-panel');conditions.append(el('h2','','Регионы и условия вариантов'));o.conditions.forEach(c=>conditions.append(el('p','gp-meta',c)));left.append(conditions);}
   const pay=el('button','gp-continue','Продолжить к оплате') as HTMLButtonElement;pay.type='button';pay.disabled=true;
   const handoff=el('div','gp-handoff');
   buy.append(pay,handoff,el('p','gp-checkout-notice','До оплаты вы остаётесь в Steam. После повторной проверки откроется настоящая карточка GGSEL для оформления. Страна оплаты определяется площадкой и не является регионом аккаунта или активации. Авторизация и оплата — только на GGSEL.'));
   const seller=el('section','gp-panel');seller.append(el('h2','','Продавец'),el('div','gp-meta',o.seller),el('div','gp-meta',o.sellerRating===undefined?'Рейтинг продавца не указан':`Рейтинг продавца: ${o.sellerRating.toFixed(1)} / 5`),el('div','gp-meta',product.sellerReviews===undefined?'Количество отзывов продавца не указано':`Отзывы продавца: ${product.sellerReviews}`),el('div','gp-meta',product.positiveReviews===undefined?'Отзывы о товаре не предоставлены':`Положительные отзывы о товаре: ${product.positiveReviews}`));
   let selection=defaultSelection(product.options,savedSelections.get(`${appid}:${o.id}`));let quote:{amount:number;fetchedAt:number}|undefined;
   const fields=el('section','gp-panel gp-options');
   if(product.options.length){fields.append(el('h2','','Выберите вариант и параметры'));for(const option of product.options){
    const label=el('label','gp-field',option.label+(option.required?' *':''));
    if(option.variants.length&&option.type!=='checkbox'){
     const input=el('select') as HTMLSelectElement;input.dataset.optionId=option.id;const empty=el('option','','Выберите…') as HTMLOptionElement;empty.value='';input.append(empty);
     for(const v of option.variants){const item=el('option','',v.label+(v.available?'':' — недоступно')) as HTMLOptionElement;item.value=v.id;item.disabled=!v.available;input.append(item);}input.value=selection[option.id]?.[0]??'';input.onchange=()=>change(option.id,input.value?[input.value]:[]);label.append(input);
    }else if(option.type==='checkbox'){
     for(const v of option.variants){const line=el('label','gp-checkbox',v.label);const input=el('input') as HTMLInputElement;input.type='checkbox';input.value=v.id;input.disabled=!v.available;input.checked=selection[option.id]?.includes(v.id)??false;input.onchange=()=>{const old=selection[option.id]??[];change(option.id,input.checked?[...old,v.id]:old.filter(id=>id!==v.id));};line.prepend(input);label.append(line);}
    }else{const input=el(option.type==='textarea'?'textarea':'input') as HTMLInputElement;input.dataset.optionId=option.id;input.value=selection[option.id]?.[0]??'';input.maxLength=500;input.autocomplete='off';input.oninput=()=>change(option.id,input.value?[input.value]:[]);label.append(input);}
    if(/region|регион|стран/i.test(option.label))label.append(el('small','','Это параметр продавца; он не меняет страну оплаты.'));fields.append(label);
   }left.prepend(fields);}
   const remember=()=>{if(savedSelections.size>=12&&!savedSelections.has(`${appid}:${o.id}`))savedSelections.delete(savedSelections.keys().next().value!);savedSelections.set(`${appid}:${o.id}`,structuredClone(selection));};
   let debounce:ReturnType<typeof setTimeout>|undefined;
   const invalidate=()=>{++quoteGeneration;quote=undefined;pay.disabled=true;amount.textContent='Цена требует уточнения';handoff.replaceChildren();};
   function change(id:string,values:string[]){selection={...selection,[id]:values};remember();invalidate();clearTimeout(debounce);quoteStatus.textContent='Проверка выбранной комбинации…';debounce=setTimeout(()=>void check(),400);}
   async function check(initial=false):Promise<boolean>{
    if(!active)return false;
    const request=++quoteGeneration;quote=undefined;pay.disabled=true;handoff.replaceChildren();amount.textContent='Цена требует уточнения';quoteStatus.textContent='Проверка цены и наличия на GGSEL…';
    try{
     let fresh=product;if(!initial){const rawFresh=await fetchDetail(o.id,slug);const freshData=typeof rawFresh==='string'?JSON.parse(rawFresh):rawFresh;if(freshData?.status!=='ok')throw new Error(freshData?.status==='http_error'&&freshData.http_status===404?'product_removed':freshData?.status??'product_unavailable');fresh=verifiedProduct(freshData.html,expected,gameTitle,freshData.fetched_at);}
     const discrete=fresh.options.filter(option=>option.variants.length);const invalid=validateSelection(discrete,selection);if(invalid)throw new Error(invalid);
     const variant=fresh.options.find(option=>/edition|version|издани|верси/i.test(option.label));const variantLabel=variant?.variants.find(v=>selection[variant.id]?.includes(v.id))?.label;
     const selectedEdition=variantLabel?variantEdition(variantLabel,gameTitle):o.edition;
     if(variantLabel&&!selectedEdition)throw new Error('selected_variant_unconfirmed');
     const rawQuote=await backend.getGgselPrice(o.id,JSON.stringify(priceSelection(fresh.options,selection)));const confirmed=decodeQuote(rawQuote);
     if(!active||request!==quoteGeneration)return false;
     quote=confirmed;amount.textContent=`${confirmed.amount.toLocaleString('ru-RU')} ₽`;
     quoteStatus.textContent=`Цена подтверждена GGSEL: ${new Date(confirmed.fetchedAt*1000).toLocaleTimeString('ru-RU')}. Карточка активна, выбранные варианты не отмечены недоступными. Наличие без резервирования.`;
     selectionInfo.textContent=selectionSummary(fresh.options,selection)+(variantLabel?`\nСостав: ${variantLabel} · ${selectedEdition==='dlc'?'DLC — требуется базовая игра':selectedEdition==='bundle'?'Набор':String(selectedEdition).toUpperCase()}`:'')+`\nТовар ${o.id}; варианты: ${JSON.stringify(priceSelection(fresh.options,selection))}`;
     heading.textContent=variantLabel?(normalize(variantLabel).startsWith(normalize(gameTitle))?variantLabel:`${gameTitle} · ${variantLabel}`):o.title;
     const regionOption=fresh.options.find(option=>/region|регион|стран/i.test(option.label));const regionLabel=regionOption?.variants.filter(v=>selection[regionOption.id]?.includes(v.id)).map(v=>v.label).join(', ');
     variantMeta.textContent=`${o.kind} · ${selectedEdition==='dlc'?'DLC — требуется базовая игра':selectedEdition==='bundle'?'Набор':String(selectedEdition).toUpperCase()}\n${regionLabel?`${regionOption!.label}: ${regionLabel}\nРегион активации и условия доставки — в описании продавца.`:o.region}`;
     const required=validateSelection(fresh.options,selection);pay.disabled=!!required;if(required)quoteStatus.textContent+=`\n${required}`;remember();return !required;
    }catch(e){if(active&&request===quoteGeneration){quote=undefined;amount.textContent='Цена требует уточнения';quoteStatus.textContent=productError(e);pay.disabled=true;}return false;}
   }
   const recheck=el('button','gp-back','Проверить цену снова') as HTMLButtonElement;recheck.type='button';recheck.onclick=()=>void check();buy.append(recheck);
   pay.onclick=async()=>{const before=quote?.amount;clearTimeout(debounce);if(!await check())return;if(!active||!quote)return;
    const confirmed=quote as {amount:number;fetchedAt:number};const linkData=selectionProductUrl(o.url,product.options,selection);
    handoff.append(el('p','gp-notice',before!==confirmed.amount?`Цена изменилась: ${before?.toLocaleString('ru-RU')} ₽ → ${confirmed.amount.toLocaleString('ru-RU')} ₽. Подтвердите новую цену переходом ниже.`:`Цена повторно подтверждена: ${confirmed.amount.toLocaleString('ru-RU')} ₽.`));
    handoff.append(el('p','gp-checkout-notice',linkData.complete?'GGSEL использует предвыбор вариантов в ссылке. Проверьте их после открытия: платёжная цена определяется площадкой.':'Варианты передаются, где поддерживается предвыбор GGSEL. Текстовые поля и несколько флажков не передаются: заполните их на GGSEL повторно.'));
    const link=el('a','gp-payment-link','Подтвердить и открыть GGSEL для оплаты') as HTMLAnchorElement;link.href=linkData.url;link.target='_blank';link.rel='noopener noreferrer';link.onclick=(event)=>{if(!quote||Date.now()/1000-quote.fetchedAt>15){event.preventDefault();handoff.replaceChildren(el('p','','Подтверждение устарело. Нажмите «Продолжить к оплате» ещё раз.'));}};handoff.append(link);
   };
   right.append(buy,seller);grid.append(left,right);body.replaceChildren(grid,el('p','gp-origin',`Источник: GGSEL · товар ${o.id}. Итоговая цена и доступность определяются площадкой. Условия возврата не предоставлены отдельным полем; читайте условия продавца и правила GGSEL перед оплатой.`));
   const reviews=el('section','gp-panel');reviews.append(el('h2','','Отзывы покупателей GGSEL'),el('p','','Загрузка отзывов…'));left.append(reviews);
   void Promise.resolve().then(()=>backend.getGgselReviews(o.id)).then(raw=>{if(!active)return;const r=typeof raw==='string'?JSON.parse(raw):raw;reviews.replaceChildren(el('h2','','Отзывы покупателей GGSEL'));if(r?.status!=='ok'||r.data?.success!==true||!Array.isArray(r.data.data)){reviews.append(el('p','','Отзывы временно недоступны'));return;}const items=r.data.data.slice(0,3);if(!items.length)reviews.append(el('p','','Отзывов пока нет'));for(const review of items)if(typeof review.text_response==='string'){const item=el('article','gp-review');item.append(el('p','gp-meta',`${typeof review.stars_count==='number'?`★ ${review.stars_count}/5 · `:''}${typeof review.date_response==='string'?review.date_response.slice(0,10):''}`),el('p','gp-description',review.text_response));reviews.append(item);}}).catch(()=>{if(active)reviews.replaceChildren(el('h2','','Отзывы покупателей GGSEL'),el('p','','Отзывы временно недоступны'));});
   await check(true);
  }catch(e){if(!active)return;const error=el('div','gp-error',productError(e)+' Цена и оформление скрыты.');const retry=el('button','','Повторить') as HTMLButtonElement;retry.type='button';retry.onclick=()=>void load();body.replaceChildren(error,retry);console.warn('[Steam × GGSEL] product verification',e instanceof Error?e.message:'failed');}
 };await load();
}
