import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {matchPurchaseBlock,catalogProducts,toOffer} from '../webview/offers';
import {readFileSync} from 'node:fs';
function match(html:string,appid='1091500'){
 const w=new Window();w.document.body.innerHTML=`<div class="game_area_purchase_game">${html}</div>`;
 return matchPurchaseBlock(w.document.body.firstElementChild! as unknown as Element,appid,'Cyberpunk 2077');
}
test('current Steam h2 purchase headings are recognized for both editions',()=>{
 expect(match('<h2>Купить Cyberpunk 2077</h2><input name="subid" value="367653">').edition).toBe('standard');
 expect(match('<h2>Купить Cyberpunk 2077: Полное издание</h2><input name="bundleid" value="32470">').edition).toBe('ultimate');
});

test('zero bundleid in a normal Steam package form does not turn a base game into a bundle',()=>{
 expect(match('<h1>Купить Cyberpunk 2077</h1><input name="subid" value="367653"><input name="bundleid" value="0">')).toMatchObject({edition:'standard',reason:'exact_heading',bundleIds:[],packageIds:['367653']});
});
test('reviewed Ultimate bundle accepts Russian complete-edition title and ignores Steam bundle badge',()=>{
 const m=match('<h1>Купить Cyberpunk 2077: Полное издание <span class="bundle_label">НАБОР (?)</span></h1><input name="subid" value="0"><input name="bundleid" value="32470">');
 expect(m).toMatchObject({edition:'ultimate',reason:'reviewed_bundle_32470',bundleIds:['32470']});
});
test('arbitrary bundles, wrong app and conflicting bundle identifiers remain unconfirmed',()=>{
 expect(match('<h1>Купить Cyberpunk 2077: Ultimate Edition</h1><input name="bundleid" value="999">').edition).toBeNull();
 expect(match('<h1>Купить Cyberpunk 2077: Ultimate Edition</h1><input name="bundleid" value="32470">','2138330').edition).toBeNull();
 expect(match('<h1>Купить Cyberpunk 2077: Ultimate Edition</h1><input name="bundleid" value="32470"><input name="bundleid" value="999">').edition).toBeNull();
 expect(match('<h1>Купить Cyberpunk 2077: Phantom Liberty</h1><input name="bundleid" value="0">').edition).toBeNull();
});
test('bundle data attribute on the block itself is checked',()=>{
 const w=new Window();w.document.body.innerHTML='<div class="game_area_purchase_game" data-ds-bundleid="999"><h1>Купить Cyberpunk 2077</h1></div>';
 expect(matchPurchaseBlock(w.document.body.firstElementChild! as unknown as Element,'1091500','Cyberpunk 2077').edition).toBeNull();
});
test('real captured GGSEL listings give separate offers for base package and verified Ultimate bundle',()=>{
 const products=catalogProducts(readFileSync(new URL('./fixtures/cyberpunk-public.html',import.meta.url),'utf8'),'Cyberpunk 2077');
 const offers=products.map(p=>toOffer(p,'Cyberpunk 2077')).filter(x=>x!==null);
 const standard=match('<h1>Купить Cyberpunk 2077</h1><input name="bundleid" value="0">');
 const ultimate=match('<h1>Купить Cyberpunk 2077: Ultimate Edition <span class="bundle_label">BUNDLE (?)</span></h1><input name="bundleid" value="32470">');
 expect(offers.filter(o=>o.edition===standard.edition)).toHaveLength(4);
 expect(offers.filter(o=>o.edition===ultimate.edition).map(o=>o.id)).toEqual(['102114027']);
});
