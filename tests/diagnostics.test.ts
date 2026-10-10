import {test,expect} from 'bun:test';
import {decodeQuote} from '../webview/options';
import {responseError,diagnosticSuffix} from '../webview/diagnostics';
import {productError} from '../webview/product-page';
import {discoverCatalog,catalogCandidates} from '../webview/catalog';

test('real HTTP statuses survive quote and catalog decoding without leaking server bodies',async()=>{
 try{decodeQuote({status:'http_error',http_status:503,body:'private'});}catch(e){expect(productError(e)).toContain('HTTP 503');expect(productError(e)).toContain('http_error');expect(productError(e)).not.toContain('private');}
 let searches=0;Object.defineProperty(globalThis,'backend',{configurable:true,value:{searchGgselCatalogs:async()=>{searches++;}}});
 try{await discoverCatalog('1643320','S.T.A.L.K.E.R. 2',{status:'http_error',http_status:403});throw new Error('unexpected_success');}catch(e){expect(diagnosticSuffix(e)).toBe(' (http_error; HTTP 403)');}
 expect(searches).toBe(0);
 expect(diagnosticSuffix(responseError({status:'network_error'}))).toBe(' (network_error)');
 expect(diagnosticSuffix(responseError({status:'http_error',http_status:999}))).toBe(' (http_error)');
 expect(diagnosticSuffix(new Error('password=secret'))).toBe('');
});

test('malformed search and catalog data retain their real parser error',async()=>{
 expect(()=>catalogCandidates({status:'ok',data:{data:[null]}},'Game')).toThrow('invalid_response');
 try{await discoverCatalog('123','Game',{status:'ok',html:'<html>Unknown schema</html>',http_status:200});throw new Error('unexpected_success');}catch(e){expect(diagnosticSuffix(e)).toBe(' (unrecognized_catalog_response; HTTP 200)');}
});
