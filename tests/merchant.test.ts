import {test,expect} from 'bun:test';import {Window} from 'happy-dom';
import {isProductUrl,startMerchantShell} from '../webview/merchant';
function setup(url:string){const w=new Window({url});for(const key of ['document','location','window','history','sessionStorage'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?w:(w as any)[key]});Object.defineProperty(globalThis,'backend',{configurable:true,value:{getMerchantContext:async()=>({appid:'1091500'})}});return w;}
test('merchant entry accepts only real HTTPS GGSEL product paths with no injected parameters',()=>{
 expect(isProductUrl('https://ggsel.net/en/catalog/product/cyberpunk-2077-4292081')).toBe(true);
 for(const url of ['http://ggsel.net/catalog/product/game-1','https://ggsel.net.evil.test/catalog/product/game-1','https://ggsel.net/search/game','https://ggsel.net/catalog/product/game-1?country=DE','https://user@ggsel.net/catalog/product/game-1','javascript:alert(1)'])expect(isProductUrl(url)).toBe(false);
});
test('GGSEL shell is unique, leaves original form intact and removes product skin on checkout navigation',async()=>{
 const w=setup('https://ggsel.net/catalog/product/game-1');w.document.body.innerHTML='<form action="https://payments.example/checkout"><input name="original" value="unchanged"></form>';
 const form=w.document.querySelector('form');
 try{await startMerchantShell();await startMerchantShell();expect(w.document.querySelectorAll('#steam-ggsel-navigation')).toHaveLength(1);expect(w.document.querySelector('form')).toBe(form);expect(form?.getAttribute('action')).toBe('https://payments.example/checkout');expect(w.document.documentElement.dataset.steamGgselProduct).toBe('true');w.history.pushState({},'','/checkout');await new Promise(r=>setTimeout(r,350));expect(w.document.documentElement.dataset.steamGgselProduct).toBeUndefined();expect((w.document.getElementById('steam-ggsel-product-skin') as unknown as HTMLStyleElement).disabled).toBe(true);}finally{w.happyDOM.abort();}
});
test('external payment providers receive neither shell nor CSS',async()=>{
 const w=setup('https://paypal.com/checkout');try{await startMerchantShell();expect(w.document.getElementById('steam-ggsel-navigation')).toBeNull();expect(w.document.getElementById('steam-ggsel-product-skin')).toBeNull();}finally{w.happyDOM.abort();}
});
