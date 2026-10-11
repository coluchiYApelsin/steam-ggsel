export type Edition = 'standard' | 'deluxe' | 'ultimate' | 'complete' | 'premium';
export type Offer = {
  id: string; title: string; edition: Edition; kind: 'Steam-ключ' | 'Steam Gift' | 'Аккаунт';
  price: number; priceFrom: boolean; seller: string; sellerRating?: number; catalogTitle?:string;
  productReviews?: number; sellerId?:string; configurable?:boolean; sourceTitle?:string; defaultVariant?:string; region: string; conditions: string[]; url: string;
};
export const normalize = (s: string) => s.replace(/[™®©]/g, '').normalize('NFKC').toLowerCase().replace(/\b(?:[a-z]\.){2,}/g,v=>v.replace(/\./g,'')).replace(/[’']/g,'').replace(/&/g,' and ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
// This exact official game-name alias is reviewed; do not remove accents from
// arbitrary titles or merge the 2018 God of War with its sequel.
export const normalizeGameName=(s:string)=>normalize(s).replace(/^god of war ragnarök(?= |$)/,'god of war ragnarok');

export function editionForHeading(heading: string, title: string): Edition | null {
  const h = normalize(heading).replace(/^(buy|купить|purchase) /, '');
  const base = normalize(title);
  if (h === base || h === `${base} standard edition`) return 'standard';
  for (const e of ['deluxe', 'ultimate', 'complete', 'premium'] as const) {
    if (h === `${base} ${e}` || h === `${base} ${e} edition`) return e;
  }
  return null;
}

export type PurchaseMatch = {edition:Edition|null;reason:string;heading:string;bundleIds:string[];packageIds:string[]};
export function matchPurchaseBlock(block: Element, appid: string, gameTitle: string): PurchaseMatch {
  const headingNode = block.querySelector('h1, h2, .game_area_purchase_game_name')?.cloneNode(true) as Element | undefined;
  // Steam places its bundle badge/help text inside h1; it is not part of the product name.
  headingNode?.querySelectorAll('.bundle_label').forEach(e=>e.remove());
  const heading = headingNode?.textContent?.trim() ?? '';
  const ids = (name:string,attribute:string) => [...new Set([block,...block.querySelectorAll(`[${attribute}], input[name="${name}"]`)]
    .filter(e=>e===block || e.closest('.game_area_purchase_game')===block)
    .flatMap(e=>[e.getAttribute(attribute),e.matches(`input[name="${name}"]`) ? e.getAttribute('value') : null])
    .filter((s):s is string=>!!s && /^\d+$/.test(s) && Number(s)>0))];
  // Steam forms can contain bundleid=0 alongside a real subid. Zero is not a bundle.
  const bundleIds=ids('bundleid','data-ds-bundleid'),packageIds=ids('subid','data-ds-packageid');
  const result=(edition:Edition|null,reason:string):PurchaseMatch=>({edition,reason,heading,bundleIds,packageIds});
  if(bundleIds.length){
    // Reviewed Steam bundle 32470 contains Cyberpunk 2077 + Phantom Liberty.
    // Never infer that an arbitrary bundle is an Ultimate/Complete edition from its label.
    const h=normalize(heading).replace(/^(buy|купить|purchase) /,'');
    const allowed=['cyberpunk 2077 ultimate edition','cyberpunk 2077 ultimate','cyberpunk 2077 полное издание'];
    if(appid==='1091500' && normalize(gameTitle)==='cyberpunk 2077' && bundleIds.length===1 && bundleIds[0]==='32470' && allowed.includes(h)) return result('ultimate','reviewed_bundle_32470');
    return result(null,'unverified_bundle');
  }
  const edition=editionForHeading(heading,gameTitle);
  return result(edition,edition ? 'exact_heading' : 'unrecognized_heading');
}
type Obj = Record<string, any>;
// JSON only: never evaluate scripts received from GGSEL or insert their HTML into Steam.
export function flightRecords(html: string): unknown[] {
  if (html.length > 3000000) throw new Error('oversized_catalog');
  const records: unknown[] = [];
  let flight = '';
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const match = m[1]!.trim().match(/^self\.__next_f\.push\((\[[\s\S]*\])\);?$/);
    if (!match) continue;
    try { const data = JSON.parse(match[1]!); if (data[0] === 1 && typeof data[1] === 'string') flight += data[1]; } catch { /* unrelated script */ }
  }
  // Text rows are UTF-8 length framed, not newline framed. Their contents may
  // contain newlines or apparent JSON rows; skip exactly their declared bytes.
  const bytes=new TextEncoder().encode(flight),decoder=new TextDecoder('utf-8',{fatal:true});
  let cursor=0;
  while(cursor<bytes.length){
    let colon=cursor;while(colon<bytes.length&&bytes[colon]!==58&&bytes[colon]!==10)colon++;
    const id=decoder.decode(bytes.slice(cursor,colon));
    if(bytes[colon]!==58||! /^[a-f0-9]*$/i.test(id))throw new Error('unrecognized_catalog_response');
    let start=colon+1;
    if(bytes[start]===84){
      let comma=start+1;while(comma<bytes.length&&bytes[comma]!==44)comma++;
      const hex=decoder.decode(bytes.slice(start+1,comma));
      if(!/^[a-f0-9]+$/i.test(hex))throw new Error('unrecognized_catalog_response');
      const length=parseInt(hex,16);cursor=comma+1+length;
      if(cursor>bytes.length)throw new Error('unrecognized_catalog_response');
      decoder.decode(bytes.slice(comma+1,cursor));
    }else{
      let end=start;while(end<bytes.length&&bytes[end]!==10)end++;
      try{records.push(JSON.parse(decoder.decode(bytes.slice(start,end))));}catch{/* Non-JSON Flight module/reference rows. */}
      cursor=end<bytes.length?end+1:end;
    }
  }
  if (!records.length) throw new Error(/<title>[^<]*(captcha|access denied|verify|just a moment)/i.test(html) ? 'access_blocked' : 'unrecognized_catalog_response');
  return records;
}
export function catalogProducts(html: string, expectedTitle: string): Obj[] {
  const records=flightRecords(html);
  const products = new Map<string, Obj>();
  let verifiedCatalog = false;
  let catalogFound=false, emptyItems=false;
  function walk(v: unknown, depth = 0) {
    if (!v || typeof v !== 'object' || depth > 45) return;
    const o = v as Obj;
    if (o.digi_catalog) {catalogFound=true;if(normalizeGameName(String(o.name)) === normalizeGameName(expectedTitle)) verifiedCatalog=true;}
    if (Array.isArray(o.items) && o.items.length===0) emptyItems=true;
    if (Number.isSafeInteger(o.id_goods) && typeof o.name === 'string' && typeof o.url === 'string') {
      if ((o.seller || typeof o.seller_name==='string') && !products.has(String(o.id_goods))) products.set(String(o.id_goods), o);
    }
    Object.values(o).forEach(x => walk(x, depth + 1));
  }
  records.forEach(x => walk(x));
  if (!verifiedCatalog) throw new Error(catalogFound ? 'catalog_mismatch' : 'unrecognized_catalog_response');
  if (!products.size && !emptyItems) throw new Error('unrecognized_catalog_response');
  return [...products.values()];
}

export function inspectOffer(p: Obj, gameTitle: string): {offer:Offer|null;reason:string} {
  const reject=(reason:string)=>({offer:null,reason});
  const title = typeof p.name === 'string' ? p.name : '';
  const n = normalizeGameName(title), base = normalizeGameName(gameTitle);
  if (!n.startsWith(`${base} `)) return reject('different_game_title');
  if (!/\bsteam\b/i.test(title)) return reject('steam_platform_not_explicit');
  if (/\b(gog|xbox|ps4|ps5|epic|nintendo|rental|rent|offline|dlc|bundle|pack|upgrade)\b|аренд|оффлайн|смен[аы] регион|region chang/i.test(title)) return reject('other_platform_dlc_rental_or_bundle');
  const options: Obj[] = Array.isArray(p.options) ? p.options : [];
  if (options.some(o => /edition|version|издани|верси/i.test(String(o.label)))) return reject('configurable_details_required');
  if (options.some(o => o.type === 'radio' && !/region|регион|стран/i.test(String(o.label)))) return reject('unrecognized_order_selector');
  let rest = n.slice(base.length).trim();
  const editions = ['standard', 'deluxe', 'ultimate', 'complete', 'premium'] as const;
  const found = editions.filter(e => new RegExp(`\\b${e}\\b`).test(rest));
  if (found.length > 1) return reject('ambiguous_edition');
  const edition: Edition = found[0] ?? 'standard';
  // Unknown extra tokens can indicate another game, DLC or edition: reject them.
  rest = rest.replace(/\b(standard|deluxe|ultimate|complete|premium|edition|steam|key|gift|account|pc|auto|delivery|autodelivery|world|worldwide|global|except|without|ru|rb|by|ua|kz|cis|sng|tr|ar|ww)\b/g, '').trim();
  if (rest || /edition choice|edition selection/i.test(title)) return reject('unrecognized_title_tokens');
  const account = /\baccount\b|аккаунт/i.test(title);
  const key = /\bkey\b|ключ/i.test(title);
  const gift = /\b(gift|auto)\b/i.test(title);
  if (account && key) return reject('ambiguous_activation');
  if (!account && !key && /\bauto\b/i.test(title) && !/\bgift\b/i.test(title) && p.content_type_id !== 48) return reject('unconfirmed_auto_activation');
  if (!account && Number(key) + Number(gift) !== 1) return reject('ambiguous_activation');
  if (!p.seller && typeof p.seller_name==='string') return reject('product_details_required');
  const price = Number(p.price_wmr);
  if (!Number.isFinite(price) || price <= 0 || p.forbidden_type !== 0 || p.is_preorder || p.is_active===false) return reject('invalid_price_or_unavailable');
  if (typeof p.url !== 'string' || !/^[a-z0-9-]+-\d+$/.test(p.url) || !p.url.endsWith(`-${p.id_goods}`)) return reject('invalid_product_url');
  if(edition==='standard' && /(?:^|-)(dlc|upgrade|premium|ultimate|deluxe|complete|bundle)(?:-|$)/.test(p.url)) return reject('contradictory_product_url');
  if (typeof p.seller?.name_seller !== 'string' || !p.seller.name_seller) return reject('missing_seller');
  const regionOption = options.find(o => /region|регион|стран/i.test(String(o.label)));
  let region = 'Регион не указан — проверьте на GGSEL';
  if (regionOption) {
    const selected = (Array.isArray(regionOption.variants) ? regionOption.variants : []).find((v: Obj) => v.default === 1 || v.default === true);
    region = selected?.text ? `Цена для региона: ${String(selected.text)}` : 'Регион выбирается на GGSEL';
  } else {
    const match = title.match(/(?:WORLD(?:WIDE)?|GLOBAL|RU|CIS|UA|KZ)(?:[\s/+-]*(?:EXCEPT|RU|RB|BY|CIS|UA|KZ|WORLD(?:WIDE)?))*/i);
    if (match) region = `Регион по названию: ${match[0]}`;
    if(typeof p.verified_region==='string') region=`Регион по описанию продавца: ${p.verified_region}`;
  }
  const sellerRating = p.seller.rating;
  const conditions = options.map(o => [o.label, ...(Array.isArray(o.variants) ? o.variants.map((v: Obj) => v.text) : []), o.comment]
    .filter(x => typeof x === 'string' && x.trim()).join(' · ')).filter(Boolean);
  if(typeof p.verified_description==='string' && p.verified_description) conditions.push(p.verified_description);
  return {reason:'accepted',offer:{ id: String(p.id_goods), title, edition,
    kind: account ? 'Аккаунт' : key ? 'Steam-ключ' : 'Steam Gift', price,
    priceFrom: options.some(o => Array.isArray(o.variants) && o.variants.length > 1),
    seller: p.seller.name_seller,
    sellerId:Number.isSafeInteger(p.seller.id_seller)?String(p.seller.id_seller):undefined,
    sellerRating: typeof sellerRating === 'number' && sellerRating >= 0 && sellerRating <= 5 ? sellerRating : undefined,
    productReviews: Number.isSafeInteger(p.cnt_responses) && p.cnt_responses >= 0 ? p.cnt_responses : undefined,
    region, conditions, url: `https://ggsel.net/en/catalog/product/${p.url}` }};
}
export function toOffer(p:Obj,gameTitle:string):Offer|null{return inspectOffer(p,gameTitle).offer;}

// A missing category edition is not a conflicting edition. Base-game identity must
// still pass the complete title/token/URL checks and a corroborated Steam type.
export function categoryEditionMatches(category:Obj,offer:Offer):boolean{
 const edition=normalize(String(category.edition??'')).replace(/ edition$/,'');
 if(edition)return edition===offer.edition;
 return offer.edition==='standard'&&category.platform==='Steam'&&
  ((offer.kind==='Steam-ключ'&&category.content_type_id===2)||(offer.kind==='Steam Gift'&&category.content_type_id===48)||(offer.kind==='Аккаунт'&&category.content_type_id===1));
}

export function productRecord(html:string,id:string):Obj|undefined{
 let detail:Obj|undefined;function walk(v:unknown,depth=0){if(!v||typeof v!=='object'||depth>45)return;const o=v as Obj;if(String(o.id_goods)===id&&o.category&&o.seller&&Array.isArray(o.options))detail=o;Object.values(o).forEach(x=>walk(x,depth+1));}flightRecords(html).forEach(x=>walk(x));return detail;
}
export function variantEdition(label:string,title:string):Edition|'dlc'|'bundle'|null{
 const n=normalize(label),base=normalize(title);
 if(n===base||/^(full game|standard edition|standard|base game)$/.test(n))return 'standard';
 const exact=editionForHeading(label,title);if(exact)return exact;
 if(/^(deluxe|ultimate|complete|premium)( edition)?$/.test(n))return n.split(' ')[0] as Edition;
 if(n.startsWith(base+' ')&&/\bdlc\b|дополнени|призрачная свобода|phantom liberty/.test(n))return /full game|базовая игра|игра и|game and|игра плюс/.test(n)?'bundle':'dlc';
 if(/^full game (and )?dlc$/.test(n))return 'bundle';
 return null;
}
export function configurableOffer(detail:Obj,candidate:Obj,title:string):Offer|null{
 if(String(detail.id_goods)!==String(candidate.id_goods)||normalize(String(detail.baseCategory_name))!==normalize(title)||detail.category?.platform!=='Steam'||detail.category?.content_type_id!==48||!/steam/i.test(detail.name)||!/gift|auto/i.test(detail.name)||/gog|xbox|ps[45]|rent|offline|аренд/i.test(detail.name))return null;
  const selectors=detail.options.filter((o:Obj)=>/edition|version|издани|верси/i.test(String(o.label)));
 if(selectors.length!==1)return null;const option=selectors[0];if(!['radio','select'].includes(option.type)||!Array.isArray(option.variants))return null;
 if(option.variants.some((v:Obj)=>!variantEdition(String(v.text),title)))return null;
 const selected=option.variants.find((v:Obj)=>v.default);if(!selected||selected.disabled||selected.num_in_stock===0)return null;
 const edition=variantEdition(selected.text,title);if(!edition||edition==='dlc'||edition==='bundle')return null;
 const raw={...detail,name:`${title}${edition==='standard'?'':` ${edition} Edition`} Steam Gift`,url:candidate.url,forbidden_type:detail.category.forbidden_type,content_type_id:48,options:detail.options.filter((o:Obj)=>o!==option),seller:{...detail.seller,rating:detail.seller.statistics?.rating}};
 const offer=toOffer(raw,title);if(!offer)return null;
 return {...offer,configurable:true,sourceTitle:detail.name,defaultVariant:String(selected.value),title:`${selected.text} · выбор варианта GGSEL`,priceFrom:false};
}

// Alternative catalog cards omit seller statistics and option selectors. Never render
// those cards until the actual product page independently confirms its identity.
export function productOffer(html:string, candidate:Obj, gameTitle:string):Offer|null {
  let detail:Obj|undefined;
  function walk(v:unknown,depth=0){if(!v||typeof v!=='object'||depth>45)return;const o=v as Obj;
    if(String(o.id_goods)===String(candidate.id_goods)&&o.category&&o.seller&&Array.isArray(o.options)) detail=o;
    Object.values(o).forEach(x=>walk(x,depth+1));}
  flightRecords(html).forEach(x=>walk(x));
  if(!detail || normalizeGameName(String(detail.baseCategory_name))!==normalizeGameName(gameTitle) || detail.category.platform!=='Steam') return null;
  const configurable=configurableOffer(detail,candidate,gameTitle);if(configurable)return configurable;
  const edition=detail.category.edition==null?'standard':editionForHeading(`${gameTitle} ${detail.category.edition}`,gameTitle);
  if(!edition)return null;
  const text=String(detail.info??'').replace(/<br\s*\/?\s*>|<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
  const region=text.match(/(?:region(?: of (?:use|activation))?|регион(?: активации)?)\s*:\s*([^\n]{2,160})/i)?.[1]?.trim();
  const p={...detail,url:candidate.url,forbidden_type:detail.category.forbidden_type,content_type_id:detail.category.content_type_id,
    seller:{...detail.seller,rating:detail.seller.statistics?.rating},verified_region:region,verified_description:text.slice(0,6000)};
  const offer=toOffer(p,gameTitle);
  return offer?.edition===edition&&categoryEditionMatches(detail.category,offer) ? offer : null;
}
