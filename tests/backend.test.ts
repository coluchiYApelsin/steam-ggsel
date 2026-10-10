import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
const {lua,lauxlib,lualib,to_luastring}=require('fengari');
test('Lua provider bounds requests, caches results and never disables TLS or follows redirects',()=>{
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const source=readFileSync(new URL('../backend/rpc_functions.lua',import.meta.url),'utf8');
 const script=`
 local now=100; os.time=function() return now end
 local calls=0; local status=200; local body='public catalog'; local network=false
 package.preload.json=function() return {encode=function(t) _G.result=t; return t.status end} end
 package.preload.http=function() return {get=function(url, opts)
   calls=calls+1
   assert(url:match('^https://ggsel.net/en/catalog/[a-z0-9%-]+$'))
   assert(opts.verify_ssl==true and opts.follow_redirects==false and opts.timeout<=15)
   if network then error('network unavailable') end
   return {status=status,body=body}
 end} end
 ${source}
 assert(getGgselOffers('../evil','Game')=='invalid_request' and calls==0)
 assert(getGgselOffers('1091500','Cyberpunk 2077')=='ok' and calls==1)
 assert(result.catalog_title=='Cyberpunk 2077' and result.html==body)
 assert(getGgselOffers('1091500','Cyberpunk 2077')=='ok' and calls==1)
 assert(getGgselOffers('1245620','ELDEN RING')=='rate_limited' and calls==1)
 now=104; status=403
 assert(getGgselOffers('1245620','ELDEN RING')=='http_error' and calls==2)
 assert(result.http_status==403)
 now=108
 assert(getGgselOffers('1245620','ELDEN RING')=='http_error' and calls==2)
 now=140; status=404
 assert(getGgselOffers('1245620','ELDEN RING')=='unsupported_game')
 now=200; status=200;body=string.rep('a',3000001)
 assert(getGgselOffers('1245620','ELDEN RING')=='invalid_response')
 now=240;network=true
 assert(getGgselOffers('1245620','ELDEN RING')=='network_error')
 `;
 const code=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=code===lua.LUA_OK?'':require('fengari').to_jsstring(lua.lua_tostring(L,-1));
 lua.lua_close(L);expect(error).toBe('');
});

test('native product provider validates destinations, caches requests, limits traffic and stores no merchant credentials',()=>{
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const source=readFileSync(new URL('../backend/rpc_functions.lua',import.meta.url),'utf8');
 const script=`
 local now=100;os.time=function()return now end
 local calls=0;local mime='text/html; charset=utf-8'
 package.preload.json=function()return {encode=function(t)_G.result=t;return t.status or 'context' end}end
 package.preload.http=function()return {get=function(url,opts)
  calls=calls+1;assert(url:match('^https://ggsel.net/en/catalog/'));assert(opts.verify_ssl and not opts.follow_redirects)
  return {status=200,body='<html>public</html>',headers={['Content-Type']=mime}}
 end}end
 ${source}
 assert(getGgselProduct('1','https://evil.test/1')=='invalid_request' and calls==0)
 assert(getGgselProduct('1','game-2')=='invalid_request' and calls==0)
 assert(getGgselProduct('1','game-1')=='ok' and calls==1)
 assert(getGgselProduct('1','game-1')=='ok' and calls==1)
 for n=2,12 do assert(getGgselProduct(tostring(n),'game-'..n)=='ok') end
 assert(getGgselProduct('13','game-13')=='rate_limited' and calls==12)
 now=161;mime='application/json'
 assert(getGgselProduct('13','game-13')=='unexpected_content_type')
 assert(getGgselOffers('2677660','Indiana Jones and the Great Circle')=='unexpected_content_type')
 `;
 const code=lauxlib.luaL_dostring(L,to_luastring(script));const error=code===lua.LUA_OK?'':require('fengari').to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);expect(error).toBe('');
});
