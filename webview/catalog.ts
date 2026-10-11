import {catalogProducts,normalize} from './offers';
import {responseError} from './diagnostics';
const decode=(raw:unknown):any=>typeof raw==='string'?JSON.parse(raw):raw;
const reviewedGames:Record<string,{names:string[];slug:string;title:string}>={
 '1659420':{names:['UNCHARTED: Legacy of Thieves Collection','UNCHARTED: Наследие воров. Коллекция'],slug:'uncharted-legacy-of-thieves-collection',title:'UNCHARTED: Legacy of Thieves Collection'},
 '2322010':{names:['God of War Ragnarök','God of War Ragnarok','God of War Рагнарёк'],slug:'god-of-war-ragnarok',title:'God of War Ragnarok'},
 '367520':{names:['Hollow Knight'],slug:'hollow-knight-12543',title:'Hollow Knight'},
 '3241660':{names:['R.E.P.O.'],slug:'repo',title:'R.E.P.O.'},
};
export function reviewedCatalogFor(id:string,title:string){const game=reviewedGames[id];return game?.names.some(name=>normalize(name)===normalize(title))?game:undefined;}
export function catalogCandidates(raw:unknown,title:string):string[]{
 const result=decode(raw);if(result?.status!=='ok')throw responseError(result);
 const items=result.data?.data;if(!Array.isArray(items))throw new Error('invalid_response');
 if(items.some((c:any)=>!c||typeof c!=='object'||Array.isArray(c)))throw new Error('invalid_response');
 return [...new Set(items.filter((c:any)=>typeof c.name==='string'&&normalize(c.name)===normalize(title)&&typeof c.url==='string'&&/^[a-z0-9-]{2,150}$/.test(c.url)).map((c:any)=>c.url as string))].slice(0,2) as string[];
}
export async function discoverCatalog(id:string,title:string,initial:unknown,refresh=false):Promise<any>{
 let result=decode(initial);let reason=result?.status??'invalid_response';let failure=responseError(result);
 // Exact localized Steam labels + AppID, checked against the real store/catalog.
 const game=reviewedCatalogFor(id,title);
 if(game){
  if(result?.status==='http_error'&&result.http_status!==404)throw failure;
  const reviewed=decode(await backend.getGgselCatalog(id,title,game.slug,refresh));
  if(reviewed?.status!=='ok')throw responseError(reviewed);
  catalogProducts(reviewed.html,game.title);
  return {...reviewed,verified_title:game.title};
 }
 // Reviewed disambiguation: Steam AppID 379720 is the 2016 game, not DOOM (1993).
 if(id==='379720'&&normalize(title)==='doom'){
  const reviewed=decode(await backend.getGgselCatalog(id,title,'doom-2016',refresh));
  if(reviewed?.status==='ok'){catalogProducts(reviewed.html,'DOOM 2016');return {...reviewed,verified_title:'DOOM 2016'};}
  throw responseError(reviewed);
 }
 if(result?.status==='ok'){try{catalogProducts(result.html,title);return result;}catch(e){reason=e instanceof Error?e.message:'invalid_response';failure=responseError({...result,status:reason});}}
 if(!['unsupported_game','catalog_mismatch','http_error'].includes(reason))throw failure;
 if(reason==='http_error'&&result.http_status!==404)throw failure;
 const queries=[title,normalize(title),normalize(title.split(':')[0]!)].filter((q,i,a)=>q.length>=2&&a.indexOf(q)===i).slice(0,3);
 for(const query of queries){
  const raw=await backend.searchGgselCatalogs(query);const candidates=catalogCandidates(raw,title);
  for(const slug of candidates){result=decode(await backend.getGgselCatalog(id,title,slug,refresh));if(result?.status!=='ok'){reason=result?.status??'invalid_response';failure=responseError(result);if(reason==='http_error'&&result.http_status!==404)throw failure;continue;}
   try{catalogProducts(result.html,title);return result;}catch(e){reason=e instanceof Error?e.message:'invalid_response';}}
 }
 throw reason==='http_error'?failure:new Error(reason==='unsupported_game'?'no_matching_catalog':reason);
}
