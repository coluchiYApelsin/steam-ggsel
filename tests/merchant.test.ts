import {test,expect} from 'bun:test';import {isProductUrl} from '../webview/merchant';
test('merchant entry accepts only real HTTPS GGSEL product paths with no injected parameters',()=>{
 expect(isProductUrl('https://ggsel.net/en/catalog/product/cyberpunk-2077-4292081')).toBe(true);
 for(const url of ['http://ggsel.net/catalog/product/game-1','https://ggsel.net.evil.test/catalog/product/game-1','https://ggsel.net/search/game','https://ggsel.net/catalog/product/game-1?country=DE','https://user@ggsel.net/catalog/product/game-1','javascript:alert(1)'])expect(isProductUrl(url)).toBe(false);
});
