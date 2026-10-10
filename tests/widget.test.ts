import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {startWidget} from '../webview/preload';
const fixture=readFileSync(new URL('./fixtures/cyberpunk-public.html',import.meta.url),'utf8');
const wait=()=>new Promise(resolve=>setTimeout(resolve,210));
function setup(){const w=new Window({url:'https://store.steampowered.com/app/1091500/'});for(const key of ['document','location','MutationObserver','window'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?w:(w as any)[key]});w.document.body.innerHTML='<div class="apphub_AppName">Cyberpunk 2077</div><div class="game_area_purchase_game"><h1>Купить Cyberpunk 2077</h1><button id="steam-buy">Steam original</button></div><div class="game_area_purchase_game"><h1>Купить Cyberpunk 2077: Ultimate Edition</h1></div>';return w;}
const payload=()=>JSON.stringify({status:'ok',catalog_title:'Cyberpunk 2077',html:fixture,fetched_at:Math.floor(Date.now()/1000)});
test('sorted real offers per edition preserve Steam controls without duplicates',async()=>{const w=setup();const original=w.document.getElementById('steam-buy');let calls=0;const stop=startWidget(async()=>{calls++;return payload();});try{await wait();const roots=w.document.querySelectorAll('.ggsel-offers');expect(roots).toHaveLength(2);expect(roots[0]!.querySelectorAll('.ggsel-row')).toHaveLength(4);expect(roots[1]!.querySelectorAll('.ggsel-row')).toHaveLength(1);expect(roots[0]!.textContent).toContain('Аккаунт');expect(w.document.getElementById('steam-buy')).toBe(original);expect(roots[0]!.querySelector('.ggsel-price')?.textContent).toContain('921,99');w.document.body.append(w.document.createElement('div'));await wait();expect(w.document.querySelectorAll('.ggsel-offers')).toHaveLength(2);expect(calls).toBe(1);}finally{stop();w.happyDOM.abort();}});
test('old request cannot paint a different page; leaving app removes widgets',async()=>{const w=setup();const pending:Array<(s:string)=>void>=[];const stop=startWidget(()=>new Promise(r=>{pending.push(r);}));try{await wait();w.history.pushState({},'','/app/999/');w.document.querySelector('h1')!.textContent='Buy Other Game';await wait();pending[0]!(payload());await wait();expect(w.document.querySelectorAll('.ggsel-row')).toHaveLength(0);w.history.pushState({},'','/');w.dispatchEvent(new w.Event('popstate'));await wait();expect(w.document.querySelectorAll('.ggsel-offers')).toHaveLength(0);}finally{stop();pending.forEach(r=>r(JSON.stringify({status:'unsupported_game'})));w.happyDOM.abort();}});
test('network errors have an explicit retry',async()=>{const w=setup();const stop=startWidget(async()=>JSON.stringify({status:'network_error'}));try{await wait();expect(w.document.querySelector('.ggsel-offers')?.textContent).toContain('GGSEL недоступен');expect(w.document.querySelector('.ggsel-offers button')?.textContent).toBe('Повторить');}finally{stop();w.happyDOM.abort();}});
test('Millennium FFI may already decode the Lua JSON response into an object',async()=>{const w=setup();const stop=startWidget(async()=>JSON.parse(payload()));try{await wait();expect(w.document.querySelectorAll('.ggsel-row')).toHaveLength(5);}finally{stop();w.happyDOM.abort();}});

test('current Russian Steam h2 headers and real package/bundle forms render different editions',async()=>{
 const w=setup();
 const blocks=w.document.querySelectorAll('.game_area_purchase_game');
 blocks[0]!.innerHTML='<h2>Купить Cyberpunk 2077</h2><input name="subid" value="367653"><input name="bundleid" value="0"><button id="steam-buy">Steam original</button>';
 blocks[1]!.innerHTML='<h2>Купить Cyberpunk 2077: Полное издание</h2><input name="bundleid" value="32470">';
 const original=w.document.getElementById('steam-buy');const stop=startWidget(async()=>JSON.parse(payload()));
 try{await wait();expect(blocks[0]!.querySelectorAll('.ggsel-row')).toHaveLength(4);expect(blocks[1]!.querySelectorAll('.ggsel-row')).toHaveLength(1);expect(blocks[1]!.querySelector('.ggsel-title')?.textContent).toContain('Ultimate');expect(w.document.getElementById('steam-buy')).toBe(original);}
 finally{stop();w.happyDOM.abort();}
});
test('additional offers expand after five; unknown editions remain unconfirmed',async()=>{
 const w=setup();
 // Explicitly synthetic DOM-test records, never used by the runtime provider.
 const products=Array.from({length:8},(_,i)=>({id_goods:900000+i,name:'Cyberpunk 2077 Steam Key',url:`test-only-${900000+i}`,price_wmr:String(10+i),forbidden_type:0,seller:{name_seller:'TEST ONLY'},options:[]}));
 const html=`<script>self.__next_f.push(${JSON.stringify([1,'1:'+JSON.stringify({catalog:{name:'Cyberpunk 2077',digi_catalog:34446},products})+'\n'])})</script>`;
 w.document.querySelectorAll('h1')[1]!.textContent='Buy Cyberpunk 2077 Bundle';
 const stop=startWidget(async()=>({...JSON.parse(payload()),html}));
 try{await wait();const roots=w.document.querySelectorAll('.ggsel-offers');expect(roots[0]!.querySelectorAll(':scope > .ggsel-row')).toHaveLength(5);expect(roots[0]!.querySelector('summary')?.textContent).toBe('Ещё предложений: 3');expect(roots[0]!.querySelectorAll('details .ggsel-row')).toHaveLength(3);expect(roots[1]!.textContent).toContain('не подтверждено');expect(roots[1]!.querySelectorAll('.ggsel-row')).toHaveLength(0);}finally{stop();w.happyDOM.abort();}
});
