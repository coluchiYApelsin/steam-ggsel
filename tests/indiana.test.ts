import {test,expect} from 'bun:test';import {readFileSync} from 'node:fs';
import {catalogProducts,productOffer,inspectOffer,editionForHeading} from '../webview/offers';
const title='Indiana Jones and the Great Circle';
const catalog=readFileSync(new URL('./fixtures/indiana-catalog.html',import.meta.url),'utf8');
const detail=readFileSync(new URL('./fixtures/indiana-product.html',import.meta.url),'utf8');
const candidate=catalogProducts(catalog,title).find(p=>p.id_goods===102086349)!;
test('alternative real catalog is recognized; incomplete cards require independent product verification',()=>{
 expect(catalogProducts(catalog,title)).toHaveLength(61);
 expect(inspectOffer(candidate,title)).toEqual({offer:null,reason:'product_details_required'});
 expect(editionForHeading('Buy Indiana Jones and the Great Circle: Premium Edition',title)).toBe('premium');
});
test('actual product page confirms seller statistics, current price, Steam key and activation region',()=>{
 const offer=productOffer(detail,candidate,title)!;
 expect(offer).toMatchObject({id:'102086349',edition:'standard',kind:'Steam-ключ',price:2103,seller:'Fabulou5',sellerRating:4.9});
 expect(offer.region).toContain('RU/UA-CIS');
 expect(offer.productReviews).toBeUndefined();
 expect(offer.url).toEndWith('-102086349');
 expect(offer.conditions.join(' ')).toContain('Activation: STEAM');
});
test('wrong product, category, platform, inactive goods and conflicting upgrade slug stay excluded',()=>{
 expect(productOffer(detail,{...candidate,id_goods:999},title)).toBeNull();
 expect(productOffer(detail,candidate,'Other Game')).toBeNull();
 expect(productOffer(detail.replaceAll('"platform\\\":\\\"Steam','"platform\\\":\\\"Xbox'),candidate,title)).toBeNull();
 expect(productOffer(detail,{...candidate,url:'indiana-premium-upgrade-102086349'},title)).toBeNull();
});
test('empty results, mismatching catalog, access checks and unknown responses have different outcomes',()=>{
 const empty='<script>self.__next_f.push('+JSON.stringify([1,'1:'+JSON.stringify({catalog:{digi_catalog:110802,name:title},items:[]})+'\n'])+')</script>';
 expect(catalogProducts(empty,title)).toEqual([]);
 expect(()=>catalogProducts(catalog,'Wrong Game')).toThrow('catalog_mismatch');
 expect(()=>catalogProducts('<title>Access denied</title>',title)).toThrow('access_blocked');
 expect(()=>catalogProducts('<html>Unknown response</html>',title)).toThrow('unrecognized_catalog_response');
});
