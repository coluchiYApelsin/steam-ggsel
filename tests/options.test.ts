import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {productRecord,productOffer,variantEdition,normalize} from '../webview/offers';
import {productOptions,defaultSelection,validateSelection,priceSelection,decodeQuote,selectionProductUrl} from '../webview/options';
const html=readFileSync(new URL('./fixtures/configurable-5283641.html',import.meta.url),'utf8');
const raw=productRecord(html,'5283641')!;
test('captured real configurable product has exact edition and region IDs, not invented variants',()=>{
 const options=productOptions(raw.options);const selection=defaultSelection(options);
 expect(options.map(o=>o.id)).toEqual(['448562','448549']);
 expect(selection['448562']).toEqual(['1177043']);expect(selection['448549']).toEqual(['1177022']);
 expect(validateSelection(options,selection)).toBeNull();
 expect(productOffer(html,{id_goods:5283641,url:'cyberpunk-2077-vybor-izdaniia-vse-regiony-5283641'},'Cyberpunk 2077')?.configurable).toBe(true);
 expect(variantEdition('Cyberpunk 2077 DLC Phantom','Cyberpunk 2077')).toBe('dlc');
 expect(variantEdition('Cyberpunk 2077 Ultimate Edition','Cyberpunk 2077')).toBe('ultimate');
 expect(variantEdition('Cyberpunk 2078','Cyberpunk 2077')).toBeNull();
});
test('observed GGSEL selection codec preserves real single-choice IDs',()=>{
 const options=productOptions(raw.options);const selected={'448562':['1177048'],'448549':['1177027']};
 expect(priceSelection(options,selected)).toEqual({'448562':'1177048','448549':'1177027'});
 const result=selectionProductUrl('https://ggsel.net/en/catalog/product/cyberpunk-2077-vybor-izdaniia-vse-regiony-5283641',options,selected);
 expect(result.complete).toBe(true);expect(new URL(result.url).searchParams.get('option')).toBe('option_radio_448562_1177048_option_radio_448549_1177027');
 expect(validateSelection(options,{'448562':['999999']})).not.toBeNull();
});
test('server prices fail closed for absent, unavailable, nonnumeric and unsupported quantity responses',()=>{
 expect(decodeQuote({status:'ok',fetched_at:1,data:{success:true,data:{amount:2990,count:1}}}).amount).toBe(2990);
 for(const data of [{success:false},{success:true,data:{amount:2990,count:2}},{success:true,data:{amount:0,count:1}},{success:true,data:{amount:'2990',count:1}}])expect(()=>decodeQuote({status:'ok',fetched_at:1,data})).toThrow();
 expect(()=>decodeQuote({status:'network_error'})).toThrow('network_error');
});
test('unavailable variants and credential fields are rejected; text is never placed in a merchant URL',()=>{
 const options=productOptions([{id:1,name:'option_radio_1',type:'radio',label:'Edition',required:true,variants:[{value:2,text:'Standard',num_in_stock:0,default:true}]}]);
 expect(defaultSelection(options)['1']).toEqual([]);expect(validateSelection(options,{'1':['2']})).not.toBeNull();
 expect(()=>productOptions([{id:1,name:'option_text_1',type:'text',label:'Steam password'}])).toThrow('sensitive_option');
 const text=productOptions([{id:1,name:'option_text_1',type:'text',label:'Delivery link'}]);
 const url=selectionProductUrl('https://ggsel.net/en/catalog/product/real-1',text,{'1':['private-value']});expect(url.complete).toBe(false);expect(url.url).not.toContain('private-value');
});
test('normalization handles punctuation and apostrophes without merging sequels',()=>{
 expect(normalize("Baldur’s Gate 3™")).toBe(normalize('Baldurs Gate 3'));
 expect(normalize('Indiana Jones & the Great Circle')).toBe(normalize('Indiana Jones and the Great Circle'));
 expect(normalize('Cyberpunk 2077')).not.toBe(normalize('Cyberpunk 2078'));
});

test('malformed option schemas and duplicate identifiers fail closed',()=>{
 for(const raw of [[null],[false],[[]],[{id:1,name:'option_radio_1',type:'radio',label:'Region',variants:[null]}],[{id:1,name:'option_radio_1',type:'radio',label:'Region',variants:[{value:2,text:'RU'},{value:2,text:'Other'}]}]])expect(()=>productOptions(raw)).toThrow('unsupported_options');
 const options=productOptions(raw.options);
 expect(validateSelection(options,{'448562':['1177043'],'448549':['1177022'],unknown:['1']})).not.toBeNull();
 expect(validateSelection(options,{'448562':['1177043','1177043']})).not.toBeNull();
 expect(()=>selectionProductUrl('https://evil.test/product-1',options,defaultSelection(options))).toThrow('invalid_product_context');
 expect(()=>selectionProductUrl('https://ggsel.net/en/catalog/product/real-1',options,{'448562':['999']})).toThrow();
});

test('payment and authentication secrets are never offered as plugin inputs',()=>{
 for(const label of ['Steam Guard code','2FA','Two-factor code','CVV','CVC','Card number','Номер банковской карты','Одноразовый код','Код подтверждения','Пароль Steam'])expect(()=>productOptions([{id:1,name:'option_text_1',type:'text',label}])).toThrow('sensitive_option');
 expect(()=>productOptions([{id:1,name:'option_text_1',type:'text',label:'Data',comment:'Enter Steam Guard code'}])).toThrow('sensitive_option');
});

test('quote timestamps reject invalid or future confirmations',()=>{
 for(const fetched_at of [NaN,Infinity,0,-1,1.5,Math.floor(Date.now()/1000)+60])expect(()=>decodeQuote({status:'ok',fetched_at,data:{success:true,data:{amount:2990,count:1}}})).toThrow('invalid_price_response');
});
