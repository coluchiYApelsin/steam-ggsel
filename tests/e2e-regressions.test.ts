import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {flightRecords,catalogProducts,productOffer,normalize,normalizeGameName,categoryEditionMatches} from '../webview/offers';
import {verifiedProduct} from '../webview/product-page';
import {discoverCatalog,reviewedCatalogFor} from '../webview/catalog';
import {productOptions,defaultSelection,selectionProductUrl,priceSelection} from '../webview/options';
const flight=(data:unknown)=>`<script>self.__next_f.push(${JSON.stringify([1,'0:'+JSON.stringify(data)+'\n'])})</script>`;

test('UTF-8 text framing preserves the catalog directly after multiline text and ignores fake rows inside text',()=>{
 const text='Описание 🌍\nff:{"digi_catalog":1,"name":"Other Game"}\n';
 const stream=`1:T${new TextEncoder().encode(text).length.toString(16)},${text}2:${JSON.stringify({digi_catalog:44357,name:'God of War Ragnarok',items:[]})}\n:HL["style.css","style"]\n`;
 const html=`<script>self.__next_f.push(${JSON.stringify([1,stream.slice(0,30)])})</script><script>self.__next_f.push(${JSON.stringify([1,stream.slice(30)])})</script>`;
 expect(flightRecords(html)).toHaveLength(1);
 expect(catalogProducts(html,'God of War Ragnarök')).toEqual([]);
 expect(()=>catalogProducts(html,'Other Game')).toThrow('catalog_mismatch');
 expect(()=>flightRecords(flight(null).replace('0:null\\n','0:Tfff,short'))).toThrow();
});

for(const id of ['1659420','2322010','367520','3241660'])test(`public product ${id} remains strictly verified, including nullable base edition`,()=>{
 const fixture=JSON.parse(readFileSync(new URL(`./fixtures/e2e-${id}.json`,import.meta.url),'utf8'));
 const {detail,offer,title}=fixture;const candidate={id_goods:detail.id_goods,url:new URL(offer.url).pathname.split('/').pop()};
 const w=new Window();Object.defineProperty(globalThis,'DOMParser',{configurable:true,value:w.DOMParser});
 try{
  const verified=productOffer(flight(detail),candidate,title);expect(verified?.id).toBe(offer.id);expect(verified?.edition).toBe('standard');
  const product=verifiedProduct(flight(detail),offer,title,1);expect(product.offer.sellerId).toBe(offer.sellerId);expect(product.image).toStartWith('https://img.ggsel.net/');expect(product.description.length).toBeGreaterThan(20);
  for(const patch of [{baseCategory_name:'Different Game'},{category:{...detail.category,platform:'PlayStation'}},{category:{...detail.category,edition:'Deluxe Edition'}},{name:detail.name+' DLC'}]){
   expect(productOffer(flight({...detail,...patch}),candidate,title)).toBeNull();
   expect(()=>verifiedProduct(flight({...detail,...patch}),offer,title,1)).toThrow();
  }
  if(detail.category.edition==null){expect(categoryEditionMatches({...detail.category,content_type_id:999},offer)).toBe(false);expect(categoryEditionMatches({...detail.category,edition:'Ultimate'},offer)).toBe(false);}
 }finally{w.happyDOM.abort();}
});

test('reviewed localized UNCHARTED label requires its exact AppID and independently matching catalog',async()=>{
 const html=flight({digi_catalog:1,name:'Uncharted: Legacy of Thieves Collection',items:[]});let called='';
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{getGgselCatalog:async(id:string,title:string,slug:string)=>{called=slug;return {status:'ok',html,catalog_title:title};},searchGgselCatalogs:async()=>({status:'ok',data:{data:[]}})}});
 const result=await discoverCatalog('1659420','UNCHARTED™: Наследие воров. Коллекция',{status:'unsupported_game'});expect(called).toBe('uncharted-legacy-of-thieves-collection');expect(result.verified_title).toBe('UNCHARTED: Legacy of Thieves Collection');
 await expect(discoverCatalog('9999','UNCHARTED: Наследие воров. Коллекция',{status:'unsupported_game'})).rejects.toThrow('no_matching_catalog');
 await expect(discoverCatalog('1659420','UNCHARTED 4',{status:'unsupported_game'})).rejects.toThrow('no_matching_catalog');
 expect(normalizeGameName('God of War Ragnarök')).toBe(normalizeGameName('God of War Ragnarok'));expect(normalizeGameName('God of War')).not.toBe(normalizeGameName('God of War Ragnarök'));expect(normalize('Pokémon')).not.toBe(normalize('Pokemon'));
 expect(reviewedCatalogFor('2322010','God of War Рагнарёк')?.slug).toBe('god-of-war-ragnarok');expect(reviewedCatalogFor('1593500','God of War Рагнарёк')).toBeUndefined();
 expect(reviewedCatalogFor('367520','Hollow Knight')?.slug).toBe('hollow-knight-12543');expect(reviewedCatalogFor('367520','Hollow Knight: Silksong')).toBeUndefined();expect(reviewedCatalogFor('3241660','R.E.P.O.')?.slug).toBe('repo');expect(reviewedCatalogFor('3241660','R.E.P.O. 2')).toBeUndefined();
 await expect(discoverCatalog('2322010','God of War Рагнарёк',{status:'http_error',http_status:403})).rejects.toThrow('http_error');
});

test('Hollow Knight agreement is validated locally and quoted by ID, but must be checked again on the merchant',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/e2e-367520.json',import.meta.url),'utf8'));const options=productOptions(f.detail.options);const o=options[0]!;const selection={[o.id]:[o.variants[0]!.id]};
 expect(()=>selectionProductUrl(f.offer.url,options,defaultSelection(options))).toThrow('Заполните:');
 expect(priceSelection(options,selection)[o.id]).toBe(o.variants[0]!.id);
 const handoff=selectionProductUrl(f.offer.url,options,selection);expect(handoff.complete).toBe(false);expect(new URL(handoff.url).searchParams.has('option')).toBe(false);
});

test('R.E.P.O. passes only the selected real region; delivery text never leaves the Steam form',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/e2e-3241660.json',import.meta.url),'utf8'));const options=productOptions(f.detail.options);const selection=defaultSelection(options);selection['4478930']=['local-test-only'];
 const handoff=selectionProductUrl(f.offer.url,options,selection);expect(handoff.complete).toBe(false);expect(new URL(handoff.url).searchParams.get('option')).toBe('option_radio_6707111_46974122');expect(handoff.url).not.toContain('local-test-only');expect(priceSelection(options,selection)).not.toHaveProperty('4478930');
});
