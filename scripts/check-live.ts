import {readFileSync} from 'node:fs';
import {catalogProducts,inspectOffer,productOffer,type Offer} from '../webview/offers';
const indiana=process.argv.includes('--indiana');
const title=indiana?'Indiana Jones and the Great Circle':'Cyberpunk 2077';
const slug=indiana?'indiana-jones-and-the-great-circle':'cyberpunk-2077';
async function html(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{'User-Agent':'Steam-GGSEL/0.6.0 (public catalog verification)'}});if(!r.ok)throw new Error(`GGSEL HTTP ${r.status}`);if(!r.headers.get('content-type')?.includes('text/html'))throw new Error('Unexpected Content-Type');return r.text();}
const source=`https://ggsel.net/en/catalog/${slug}`;
const products=catalogProducts(await html(source),title),offers:Offer[]=[];
let details=0;const reasons:Record<string,number>={};
for(const p of products){const x=inspectOffer(p,title);reasons[x.reason]=(reasons[x.reason]??0)+1;
 if(x.offer)offers.push(x.offer);
 else if(x.reason==='product_details_required'&&details++<8){const offer=productOffer(await html(`https://ggsel.net/en/catalog/product/${p.url}`),p,title);if(offer)offers.push(offer);}
}
offers.sort((a,b)=>a.price-b.price);
if(offers.length<3)throw new Error(`Only ${offers.length} verified offers`);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),source,products:products.length,reasons,offers},null,2));
