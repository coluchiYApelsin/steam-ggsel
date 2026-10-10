import {test,expect} from 'bun:test';
import {catalogCandidates,discoverCatalog} from '../webview/catalog';
import {readFileSync} from 'node:fs';
import {catalogProducts,inspectOffer} from '../webview/offers';
test('reviewed DOOM AppID resolves 2016 category without accepting other DOOM games',async()=>{
 const html=readFileSync(new URL('./fixtures/doom-2016-catalog.html',import.meta.url),'utf8');
 Object.defineProperty(globalThis,'backend',{configurable:true,value:{getGgselCatalog:async(id:string,title:string,slug:string)=>{expect(id).toBe('379720');expect(slug).toBe('doom-2016');return {status:'ok',html,catalog_title:title};}}});
 const result=await discoverCatalog('379720','DOOM',{status:'unsupported_game'});expect(result.verified_title).toBe('DOOM 2016');
 const products=catalogProducts(result.html,result.verified_title);expect(products.flatMap(p=>inspectOffer(p,result.verified_title).offer??[]).length).toBeGreaterThan(0);
 expect(()=>catalogProducts(html,'DOOM Eternal')).toThrow('catalog_mismatch');expect(()=>catalogProducts(html,'DOOM 1993')).toThrow('catalog_mismatch');
});
test('search resolves actual suffixed root URLs but excludes similar games and platform subcatalogs',()=>{
 const response={status:'ok',data:{data:[{name:'DOOM Eternal',url:'doom-eternal-11779'},{name:'DOOM',url:'doom-2016'},{name:'DOOM Eternal Steam',url:'doom-eternal-keys'}]}};
 expect(catalogCandidates(response,'DOOM Eternal')).toEqual(['doom-eternal-11779']);
 expect(catalogCandidates(response,'DOOM 3')).toEqual([]);
 expect(catalogCandidates({status:'ok',data:{data:[{name:'DOOM Eternal',url:'https://evil.test'}]}},'DOOM Eternal')).toEqual([]);
 expect(catalogCandidates({status:'ok',data:{data:[{name:'S.T.A.L.K.E.R. 2: Heart of Chornobyl',url:'stalker-2'}]}},'STALKER 2 Heart of Chornobyl')).toEqual(['stalker-2']);
});
test('network and blocked responses do not become catalog structure errors',async()=>{
 await expect(discoverCatalog('1','Game',{status:'network_error'})).rejects.toThrow('network_error');
 await expect(discoverCatalog('1','Game',{status:'access_blocked'})).rejects.toThrow('access_blocked');
});
