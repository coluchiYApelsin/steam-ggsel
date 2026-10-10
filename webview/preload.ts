import { catalogProducts, matchPurchaseBlock, normalize, inspectOffer, productOffer, type Offer } from './offers';
import {openProductPage} from './product-page';
import {discoverCatalog} from './catalog';
import {diagnosticSuffix} from './diagnostics';
import {decodeQuote,defaultSelection,priceSelection,productOptions} from './options';
import {productRecord} from './offers';
const WRAP = 'ggsel-offers';
const STYLE = 'ggsel-offers-style';
const appId = () => location.hostname === 'store.steampowered.com' ? location.pathname.match(/^\/app\/(\d+)(?:\/|$)/)?.[1] ?? null : null;
const create = (tag: string, cls = '', text = '') => { const el = document.createElement(tag); el.className = cls; el.textContent = text; return el; };
type Result = { status: string; offers: Offer[]; fetchedAt?: number; gameTitle?: string; diagnostic?:string };
export function startWidget(fetchOffers: (id: string, title: string) => Promise<unknown> = (id, title) => backend.getGgselOffers(id, title)) {
  let current = '', generation = 0, scheduled = false, stopped = false;
  let loaded: Result = { status: 'loading', offers: [] };
  let forceRefresh=false;
  const title = () => document.querySelector('.apphub_AppName')?.textContent?.trim() ?? '';
  function style() {
    if (document.getElementById(STYLE) || !document.head) return;
    const el = create('style'); el.id = STYLE;
    el.textContent = `
.${WRAP}{clear:both;margin:12px 0 0;padding:12px 0 2px;border-top:1px solid #405467;color:#c7d5e0;font:12px Arial,sans-serif}
.${WRAP} .ggsel-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;margin-bottom:8px}
.${WRAP} small,.${WRAP} .ggsel-meta{color:#9aabba;font-size:11px;line-height:1.5}
.${WRAP} .ggsel-row{display:flex;align-items:center;gap:10px;justify-content:space-between;background:rgba(0,0,0,.2);padding:9px;margin-top:5px}
.${WRAP} .ggsel-info{min-width:0;flex:1}.ggsel-title{overflow-wrap:anywhere}
.${WRAP} .ggsel-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}
.${WRAP} .ggsel-price{color:#beee11;white-space:nowrap;font-size:14px}
.${WRAP} button.ggsel-buy{display:inline-block;color:#d2efa9!important;background:linear-gradient(to right,#75b022,#588a1b);padding:7px 10px;text-decoration:none;border:0;margin:0}
.${WRAP} .ggsel-buy:hover{background:#83b83b;color:#fff!important}
.${WRAP} button{color:#c7d5e0;background:#273c4d;border:1px solid #426078;padding:6px 10px;cursor:pointer;margin-top:8px}
.${WRAP} a:focus-visible,.${WRAP} button:focus-visible{outline:2px solid #66c0f4;outline-offset:2px}
.${WRAP} details{margin-top:8px}.${WRAP} summary{cursor:pointer;color:#66c0f4}
@media(max-width:640px){.${WRAP} .ggsel-row{align-items:stretch;flex-direction:column}.${WRAP} .ggsel-actions{justify-content:flex-end}}
`;
    document.head.append(el);
  }
  function row(o: Offer) {
    const r = create('div', 'ggsel-row'), info = create('div', 'ggsel-info');r.dataset.offerId=o.id;
    info.append(create('div', 'ggsel-title', o.title));
    info.append(create('div', 'ggsel-meta', [o.kind, o.seller,
      o.sellerRating === undefined ? 'Рейтинг продавца не указан' : `Продавец ★ ${o.sellerRating.toFixed(1)}/5`,
      o.productReviews === undefined ? '' : `Отзывы о товаре: ${o.productReviews}`, o.region].filter(Boolean).join(' · ')));
    if (o.conditions.length) { const details = create('details'); details.append(create('summary','','Регионы и условия продавца')); o.conditions.forEach(c=>details.append(create('div','ggsel-meta',c))); info.append(details); }
    const actions = create('div', 'ggsel-actions');
    actions.append(create('span', 'ggsel-price', `${o.priceFrom ? 'от ' : ''}${o.price.toLocaleString('ru-RU')} ₽`));
    const a = create('button', 'ggsel-buy', 'На GGSEL') as HTMLButtonElement;
    a.type='button';
    a.title='Открыть страницу товара GGSEL внутри магазина Steam';
    a.onclick=(event)=>{event.preventDefault();event.stopPropagation();const id=appId();if(id)void openProductPage(o,id,o.catalogTitle??title()).catch(()=>{a.title='Не удалось открыть страницу товара внутри Steam';});};
    actions.append(a); r.append(info, actions); return r;
  }
  function paint() {
    if (!appId()) return;
    style();
    for (const block of document.querySelectorAll('.game_area_purchase_game')) {
      const match = matchPurchaseBlock(block,appId()!,title());
      const {heading,edition} = match;
      const offers = loaded.gameTitle && normalize(loaded.gameTitle) === normalize(title()) ? loaded.offers.filter(o => o.edition === edition).sort((a,b) => a.price-b.price) : [];
      const signature = JSON.stringify([current, match, loaded.status, loaded.diagnostic, loaded.fetchedAt, offers]);
      let root = block.querySelector(`.${WRAP}`) as HTMLElement | null;
      if (root?.dataset.signature === signature) continue;
      console.info('[Steam × GGSEL] match', JSON.stringify({appid:appId(),title:title(),...match,status:loaded.status,accepted:loaded.offers.map(o=>({id:o.id,edition:o.edition})),matched:offers.length}));
      if (!root) { root = create('section', WRAP); root.setAttribute('aria-label', 'Предложения сторонней площадки GGSEL'); block.append(root); }
      root.dataset.signature = signature; root.replaceChildren();
      const head = create('div','ggsel-head'); head.append(create('strong','','Предложения GGSEL'), create('small','','Сторонняя площадка · не Valve')); root.append(head);
      if (loaded.status === 'ok' && offers.length) {
        root.append(create('small', '', 'Совпадение по названию и изданию. Проверьте условия, регион и итоговую цену на странице товара.'));
        offers.slice(0,5).forEach(o => root!.append(row(o)));
        if (offers.length > 5) { const d = create('details'); d.append(create('summary','',`Ещё предложений: ${offers.length-5}`)); offers.slice(5).forEach(o => d.append(row(o))); root.append(d); }
        if (loaded.fetchedAt) root.append(create('small','',`Данные GGSEL: ${new Date(loaded.fetchedAt*1000).toLocaleTimeString('ru-RU')}. Цена может зависеть от варианта заказа.`));
      } else {
        const messages: Record<string,string> = { no_matching_catalog:'В поиске GGSEL не найден каталог с подтверждённым названием игры.', loading: 'Загрузка и проверка предложений…', unsupported_game: 'Для этой игры пока нет проверенной привязки к каталогу GGSEL.', network_error: 'GGSEL недоступен. Повторите позже.', http_error: 'GGSEL отклонил запрос. Доступ не обходится.', rate_limited: 'Слишком частые запросы. Повторите через несколько секунд.', backend_unavailable: 'Не удалось получить ответ от плагина.', invalid_response: 'GGSEL вернул неподдерживаемый ответ.', unexpected_content_type:'GGSEL вернул ответ другого типа. Цены не показаны.', access_blocked:'GGSEL запросил проверку доступа. Защита не обходится.', catalog_mismatch:'Полученный каталог не соответствует названию игры. Цены не показаны.', unrecognized_catalog_response:'Не удалось распознать ответ каталога GGSEL. Цены не показаны.', oversized_catalog:'Ответ GGSEL превышает допустимый размер.', product_verification_failed:'Не удалось подтвердить данные страниц товаров. Повторите позже.' };
        const message = loaded.status === 'ok' ? (edition ? 'Подходящих предложений для этого издания нет.' : 'Точное соответствие этого DLC, набора или издания не подтверждено.') : messages[loaded.status] ?? 'Источник предложений недоступен.';
        const status = create('div', 'ggsel-meta', message+(loaded.diagnostic??'')); status.setAttribute('role','status'); root.append(status);
        if (loaded.status !== 'loading') { const retry = create('button','','Повторить') as HTMLButtonElement; retry.type='button'; retry.onclick=()=>{forceRefresh=true;current='';refresh();}; root.append(retry); }
      }
    }
  }
  async function load(id: string, request: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const requestTitle = title();
    try {
      const retrying=forceRefresh;forceRefresh=false;
      const initial=retrying ? backend.getGgselCatalog(id,requestTitle,'',true) : fetchOffers(id,requestTitle);
      const raw = await Promise.race([initial, new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('rpc_timeout')),20000);})]);
      const data = await discoverCatalog(id,requestTitle,raw,retrying);
      if (!data || typeof data !== 'object') throw new Error('invalid_response');
      if (stopped || request !== generation || appId() !== id) return;
      if (data.status !== 'ok') loaded = { status: String(data.status), offers: [] };
      else {
        if (typeof data.html !== 'string' || typeof data.catalog_title !== 'string' || typeof data.fetched_at !== 'number') throw new Error('invalid_response');
        if (normalize(data.catalog_title) !== normalize(requestTitle)) throw new Error('invalid_response');
        const verifiedTitle=data.verified_title??data.catalog_title;
        const products=catalogProducts(data.html,verifiedTitle);
        const inspected=products.map(p=>inspectOffer(p,verifiedTitle));
        const reasons:Record<string,number>={};inspected.forEach(x=>{reasons[x.reason]=(reasons[x.reason]??0)+1;});
        console.info('[Steam × GGSEL] catalog',JSON.stringify({appid:id,title:requestTitle,products:products.length,reasons}));
        const offers=inspected.map(x=>x.offer).filter((o):o is Offer=>o!==null);
        const candidates=products.filter((_,i)=>['product_details_required','configurable_details_required'].includes(inspected[i]?.reason??'')).slice(0,8);
        let detailFailures=0;
        // At most eight public product pages; do not accept incomplete catalog cards.
        for(const candidate of candidates){
          if(stopped||request!==generation||appId()!==id)return;
          try{const rawDetail=await (retrying?backend.getGgselProductFresh:backend.getGgselProduct)(String(candidate.id_goods),candidate.url);const detail=typeof rawDetail==='string'?JSON.parse(rawDetail):rawDetail;
            if(detail?.status==='ok'&&typeof detail.html==='string'){const offer=productOffer(detail.html,candidate,verifiedTitle);if(offer){if(offer.configurable){const record=productRecord(detail.html,offer.id);const options=productOptions(record?.options);const selected=defaultSelection(options);const quote=decodeQuote(await backend.getGgselPrice(offer.id,JSON.stringify(priceSelection(options,selected))));offer.price=quote.amount;}offers.push(offer);}}else detailFailures++;
          }catch{detailFailures++;}
        }
        if(stopped||request!==generation||appId()!==id)return;
        offers.forEach(o=>o.catalogTitle=verifiedTitle);
        loaded = { status:!offers.length&&candidates.length&&detailFailures ? 'product_verification_failed' : 'ok', gameTitle:requestTitle, fetchedAt:data.fetched_at, offers };
      }
    } catch (e) {
      if (stopped || request !== generation || appId() !== id) return;
      loaded = { status:e instanceof Error && ['network_error','http_error','rate_limited','unexpected_content_type','no_matching_catalog','unsupported_game','access_blocked','catalog_mismatch','unrecognized_catalog_response','oversized_catalog','invalid_response'].includes(e.message) ? e.message : 'backend_unavailable', offers:[] };
      loaded.diagnostic=diagnosticSuffix(e);
      console.warn('[Steam × GGSEL]', e instanceof Error ? e.message+loaded.diagnostic : 'RPC failed');
    } finally { clearTimeout(timer); }
    paint();
  }
  function refresh() {
    if (stopped) return;
    const id = appId();
    if (!id) { document.querySelectorAll(`.${WRAP}`).forEach(el=>el.remove()); if(current){current='';++generation;} return; }
    if (!title()) return;
    if (id !== current || (loaded.fetchedAt && Date.now()/1000-loaded.fetchedAt>=600)) {
      current=id; loaded={status:'loading',offers:[]}; const request=++generation; paint(); void load(id,request);
    } else paint();
  }
  const schedule=()=>{if(scheduled||stopped)return;scheduled=true;setTimeout(()=>{scheduled=false;refresh();},150);};
  const observer=new MutationObserver(schedule); observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  const interval=setInterval(schedule,1000); window.addEventListener('popstate',schedule); schedule();
  return ()=>{stopped=true;++generation;observer.disconnect();clearInterval(interval);window.removeEventListener('popstate',schedule);document.querySelectorAll(`.${WRAP}`).forEach(el=>el.remove());};
}
export default function main() {
  if(location.hostname!=='store.steampowered.com')return;
  const w=window as Window & {__steamGgselCleanup?:()=>void};
  w.__steamGgselCleanup?.(); w.__steamGgselCleanup=startWidget();
}
