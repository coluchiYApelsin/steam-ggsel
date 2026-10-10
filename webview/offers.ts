export type Edition = 'standard' | 'deluxe' | 'ultimate' | 'complete';
export type Offer = {
  id: string; title: string; edition: Edition; kind: 'Steam-ключ' | 'Steam Gift' | 'Аккаунт';
  price: number; priceFrom: boolean; seller: string; sellerRating?: number;
  productReviews?: number; region: string; conditions: string[]; url: string;
};
export const normalize = (s: string) => s.toLowerCase().replace(/[™®©]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

export function editionForHeading(heading: string, title: string): Edition | null {
  const h = normalize(heading).replace(/^(buy|купить|purchase) /, '');
  const base = normalize(title);
  if (h === base || h === `${base} standard edition`) return 'standard';
  for (const e of ['deluxe', 'ultimate', 'complete'] as const) {
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
export function catalogProducts(html: string, expectedTitle: string): Obj[] {
  if (html.length > 3000000) throw new Error('oversized_catalog');
  const records: unknown[] = [];
  let flight = '';
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const match = m[1]!.trim().match(/^self\.__next_f\.push\((\[[\s\S]*\])\);?$/);
    if (!match) continue;
    try { const data = JSON.parse(match[1]!); if (data[0] === 1 && typeof data[1] === 'string') flight += data[1]; } catch { /* unrelated script */ }
  }
  for (const line of flight.split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    try { records.push(JSON.parse(line.slice(i + 1))); } catch { /* Flight references / text */ }
  }
  const products = new Map<string, Obj>();
  let verifiedCatalog = false;
  function walk(v: unknown, depth = 0) {
    if (!v || typeof v !== 'object' || depth > 45) return;
    const o = v as Obj;
    if (o.digi_catalog && normalize(String(o.name)) === normalize(expectedTitle)) verifiedCatalog = true;
    if (Number.isSafeInteger(o.id_goods) && typeof o.name === 'string' && typeof o.url === 'string') {
      if (o.seller && !products.has(String(o.id_goods))) products.set(String(o.id_goods), o);
    }
    Object.values(o).forEach(x => walk(x, depth + 1));
  }
  records.forEach(x => walk(x));
  if (!verifiedCatalog || !products.size) throw new Error('catalog_schema_changed');
  return [...products.values()];
}

export function inspectOffer(p: Obj, gameTitle: string): {offer:Offer|null;reason:string} {
  const reject=(reason:string)=>({offer:null,reason});
  const title = typeof p.name === 'string' ? p.name : '';
  const n = normalize(title), base = normalize(gameTitle);
  if (!n.startsWith(`${base} `)) return reject('different_game_title');
  if (!/\bsteam\b/i.test(title)) return reject('steam_platform_not_explicit');
  if (/\b(gog|xbox|ps4|ps5|epic|nintendo|rental|rent|offline|dlc|bundle|pack|upgrade)\b|аренд|оффлайн|смен[аы] регион|region chang/i.test(title)) return reject('other_platform_dlc_rental_or_bundle');
  const options: Obj[] = Array.isArray(p.options) ? p.options : [];
  if (options.some(o => /edition|издани|верси/i.test(String(o.label)))) return reject('seller_edition_selector');
  if (options.some(o => o.type === 'radio' && !/region|регион|стран/i.test(String(o.label)))) return reject('unrecognized_order_selector');
  let rest = n.slice(base.length).trim();
  const editions = ['standard', 'deluxe', 'ultimate', 'complete'] as const;
  const found = editions.filter(e => new RegExp(`\\b${e}\\b`).test(rest));
  if (found.length > 1) return reject('ambiguous_edition');
  const edition: Edition = found[0] ?? 'standard';
  // Unknown extra tokens can indicate another game, DLC or edition: reject them.
  rest = rest.replace(/\b(standard|deluxe|ultimate|complete|edition|steam|key|gift|account|pc|auto|delivery|world|worldwide|global|except|ru|rb|by|ua|kz|cis|sng|tr|ar)\b/g, '').trim();
  if (rest || /edition choice|edition selection/i.test(title)) return reject('unrecognized_title_tokens');
  const account = /\baccount\b|аккаунт/i.test(title);
  const key = /\bkey\b|ключ/i.test(title);
  const gift = /\b(gift|auto)\b/i.test(title);
  if (account && key) return reject('ambiguous_activation');
  if (!account && !key && /\bauto\b/i.test(title) && !/\bgift\b/i.test(title) && p.content_type_id !== 48) return reject('unconfirmed_auto_activation');
  if (!account && Number(key) + Number(gift) !== 1) return reject('ambiguous_activation');
  const price = Number(p.price_wmr);
  if (!Number.isFinite(price) || price <= 0 || p.forbidden_type !== 0 || p.is_preorder) return reject('invalid_price_or_unavailable');
  if (typeof p.url !== 'string' || !/^[a-z0-9-]+-\d+$/.test(p.url) || !p.url.endsWith(`-${p.id_goods}`)) return reject('invalid_product_url');
  if (typeof p.seller?.name_seller !== 'string' || !p.seller.name_seller) return reject('missing_seller');
  const regionOption = options.find(o => /region|регион|стран/i.test(String(o.label)));
  let region = 'Регион не указан — проверьте на GGSEL';
  if (regionOption) {
    const selected = (Array.isArray(regionOption.variants) ? regionOption.variants : []).find((v: Obj) => v.default === 1 || v.default === true);
    region = selected?.text ? `Цена для региона: ${String(selected.text)}` : 'Регион выбирается на GGSEL';
  } else {
    const match = title.match(/(?:WORLD(?:WIDE)?|GLOBAL|RU|CIS|UA|KZ)(?:[\s/+-]*(?:EXCEPT|RU|RB|BY|CIS|UA|KZ|WORLD(?:WIDE)?))*/i);
    if (match) region = `Регион по названию: ${match[0]}`;
  }
  const sellerRating = p.seller.rating;
  const conditions = options.map(o => [o.label, ...(Array.isArray(o.variants) ? o.variants.map((v: Obj) => v.text) : []), o.comment]
    .filter(x => typeof x === 'string' && x.trim()).join(' · ')).filter(Boolean);
  return {reason:'accepted',offer:{ id: String(p.id_goods), title, edition,
    kind: account ? 'Аккаунт' : key ? 'Steam-ключ' : 'Steam Gift', price,
    priceFrom: options.some(o => Array.isArray(o.variants) && o.variants.length > 1),
    seller: p.seller.name_seller,
    sellerRating: typeof sellerRating === 'number' && sellerRating >= 0 && sellerRating <= 5 ? sellerRating : undefined,
    productReviews: Number.isSafeInteger(p.cnt_responses) && p.cnt_responses >= 0 ? p.cnt_responses : undefined,
    region, conditions, url: `https://ggsel.net/en/catalog/product/${p.url}` }};
}
export function toOffer(p:Obj,gameTitle:string):Offer|null{return inspectOffer(p,gameTitle).offer;}
