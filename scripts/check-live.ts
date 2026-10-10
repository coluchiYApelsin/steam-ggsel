import {readFileSync} from 'node:fs';
import {catalogProducts,toOffer} from '../webview/offers';
const response=await fetch('https://ggsel.net/en/catalog/cyberpunk-2077',{signal:AbortSignal.timeout(20000),redirect:'error',headers:{'User-Agent':'Steam-GGSEL/0.5.0 (public catalog comparison)'}});
if(!response.ok)throw new Error(`GGSEL HTTP ${response.status}`);
const html=await response.text();
const products=catalogProducts(html,'Cyberpunk 2077');
const offers=products.map(p=>toOffer(p,'Cyberpunk 2077')).filter(o=>o!==null).sort((a,b)=>a.price-b.price);
if(offers.length<3)throw new Error(`Only ${offers.length} matching offers`);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),products:products.length,offers},null,2));
