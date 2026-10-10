import {productRecord,productOffer} from '../webview/offers';
import {productOptions,defaultSelection,validateSelection,priceSelection,decodeQuote,selectionProductUrl} from '../webview/options';
const slug='cyberpunk-2077-vybor-izdaniia-vse-regiony-5283641';
const url=`https://ggsel.net/en/catalog/product/${slug}`;
const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))throw new Error(`product_http_${response.status}`);
const html=await response.text();const offer=productOffer(html,{id_goods:5283641,url:slug},'Cyberpunk 2077');
if(!offer?.configurable)throw new Error('configurable_identity_not_confirmed');
const record=productRecord(html,offer.id)!;const options=productOptions(record.options);
const defaults=defaultSelection(options);const edition=options.find(o=>/version|edition/i.test(o.label));
if(!edition)throw new Error('edition_option_missing');
for(const variant of edition.variants.filter(v=>v.available)){
 const selected={...defaults,[edition.id]:[variant.id]};const invalid=validateSelection(options,selected);if(invalid)throw new Error(invalid);
 const q=new URLSearchParams({currency:'RUB',unit_count:'1'});for(const [id,value]of Object.entries(priceSelection(options,selected)))q.set(`options[${id}]`,value);
 const r=await fetch(`https://api.ggsel.com/goods/${offer.id}/price?${q}`,{redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(r.status!==200||!r.headers.get('content-type')?.includes('application/json'))throw new Error(`quote_http_${r.status}`);
 const quote=decodeQuote({status:'ok',data:await r.json(),fetched_at:Math.floor(Date.now()/1000)});
 console.log(JSON.stringify({id:offer.id,seller:offer.seller,variant:variant.label,selection:priceSelection(options,selected),amount:quote.amount,currency:'RUB',handoff:selectionProductUrl(url,options,selected),checked_at:new Date().toISOString()}));
}
