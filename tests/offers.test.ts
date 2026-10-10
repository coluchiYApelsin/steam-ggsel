import {describe,test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {catalogProducts,editionForHeading,toOffer} from '../webview/offers';
const html=readFileSync(new URL('./fixtures/cyberpunk-public.html',import.meta.url),'utf8');
const products=catalogProducts(html,'Cyberpunk 2077');
const accepted=products.map(p=>toOffer(p,'Cyberpunk 2077')).filter(x=>x!==null);
describe('public catalog and conservative matching',()=>{
 test('multiple actual offers, unique IDs and real seller ratings',()=>{expect(products).toHaveLength(60);expect(accepted.length).toBeGreaterThanOrEqual(3);expect(new Set(accepted.map(x=>x.id)).size).toBe(accepted.length);expect(accepted.every(x=>x.price>0&&x.url.startsWith('https://ggsel.net/en/catalog/product/'))).toBe(true);});
 test('GOG, consoles, rental, DLC and edition selectors are excluded',()=>{for(const id of [5356446,102126770,102734838,3935096,4758662,3248664])expect(toOffer(products.find(p=>p.id_goods===id)!,'Cyberpunk 2077')).toBeNull();});
 test('account with a bonus gift remains an account',()=>{const a=accepted.find(x=>x.id==='102326188');expect(a?.kind).toBe('Аккаунт');expect(a?.sellerRating).toBe(4.9);expect(a?.productReviews).toBe(15);});
 test('region and variable price are visible',()=>{const a=accepted.find(x=>x.id==='4292081');expect(a?.kind).toBe('Steam Gift');expect(a?.priceFrom).toBe(true);expect(a?.region).toContain('Цена для региона:');});
 test('base, known editions, DLC and bundles never silently cross match',()=>{expect(editionForHeading('Купить Cyberpunk 2077','Cyberpunk 2077')).toBe('standard');expect(editionForHeading('Buy Cyberpunk 2077: Ultimate Edition','Cyberpunk 2077')).toBe('ultimate');for(const suffix of ['Phantom Liberty','Bundle','Ultimate Edition + Bonus','Game of the Year'])expect(editionForHeading('Buy Cyberpunk 2077 '+suffix,'Cyberpunk 2077')).toBeNull();});
 test('challenge, malformed payload and wrong catalog fail closed',()=>{expect(()=>catalogProducts('<html>CAPTCHA</html>','Cyberpunk 2077')).toThrow();expect(()=>catalogProducts(html,'Other Game')).toThrow();});
 test('untrusted URL, invalid price, missing seller and ambiguous activation rejected',()=>{const p=products.find(p=>p.id_goods===102326188)!;for(const patch of [{url:'https://evil.test/1'},{price_wmr:'NaN'},{seller:null},{name:'Cyberpunk 2077 Steam Key Gift'},{name:'Cyberpunk 2077 Steam Something Else'}])expect(toOffer({...p,...patch},'Cyberpunk 2077')).toBeNull();});
});
