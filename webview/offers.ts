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

export function toOffer(p: Obj, gameTitle: string): Offer | null {
  const title = typeof p.name === 'string' ? p.name : '';
  const n = normalize(title), base = normalize(gameTitle);
  if (!n.startsWith(`${base} `) || !/\bsteam\b/i.test(title)) return null;
  if (/\b(gog|xbox|ps4|ps5|epic|nintendo|rental|rent|offline|dlc|bundle|pack|upgrade)\b|аренд|оффлайн|смен[аы] регион|region chang/i.test(title)) return null;
  const options: Obj[] = Array.isArray(p.options) ? p.options : [];
  if (options.some(o => /edition|издани|верси/i.test(String(o.label)))) return null;
  if (options.some(o => o.type === 'radio' && !/region|регион|стран/i.test(String(o.label)))) return null;
  let rest = n.slice(base.length).trim();
  const editions = ['standard', 'deluxe', 'ultimate', 'complete'] as const;
  const found = editions.filter(e => new RegExp(`\\b${e}\\b`).test(rest));
  if (found.length > 1) return null;
  const edition: Edition = found[0] ?? 'standard';
  // Unknown extra tokens can indicate another game, DLC or edition: reject them.
  rest = rest.replace(/\b(standard|deluxe|ultimate|complete|edition|steam|key|gift|account|pc|auto|delivery|world|worldwide|global|except|ru|rb|by|ua|kz|cis|sng|tr|ar)\b/g, '').trim();
  if (rest || /edition choice|edition selection/i.test(title)) return null;
  const account = /\baccount\b|аккаунт/i.test(title);
  const key = /\bkey\b|ключ/i.test(title);
  const gift = /\b(gift|auto)\b/i.test(title);
  if (account && key) return null;
  if (!account && !key && /\bauto\b/i.test(title) && !/\bgift\b/i.test(title) && p.content_type_id !== 48) return null;
  if (!account && Number(key) + Number(gift) !== 1) return null;
  const price = Number(p.price_wmr);
  if (!Number.isFinite(price) || price <= 0 || p.forbidden_type !== 0 || p.is_preorder) return null;
  if (typeof p.url !== 'string' || !/^[a-z0-9-]+-\d+$/.test(p.url) || !p.url.endsWith(`-${p.id_goods}`)) return null;
  if (typeof p.seller?.name_seller !== 'string' || !p.seller.name_seller) return null;
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
  return { id: String(p.id_goods), title, edition,
    kind: account ? 'Аккаунт' : key ? 'Steam-ключ' : 'Steam Gift', price,
    priceFrom: options.some(o => Array.isArray(o.variants) && o.variants.length > 1),
    seller: p.seller.name_seller,
    sellerRating: typeof sellerRating === 'number' && sellerRating >= 0 && sellerRating <= 5 ? sellerRating : undefined,
    productReviews: Number.isSafeInteger(p.cnt_responses) && p.cnt_responses >= 0 ? p.cnt_responses : undefined,
    region, conditions, url: `https://ggsel.net/en/catalog/product/${p.url}` };
}
