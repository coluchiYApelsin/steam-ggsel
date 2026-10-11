local http=require('http')
local json=require('json')
local window,count=0,0
local function request(path,payload)
 local now=os.time();if now-window>=60 then window=now;count=0 end
 if count>=60 then return json.encode({status='rate_limited'}) end;count=count+1
 local opts={timeout=12,follow_redirects=false,verify_ssl=true,user_agent='Steam-GGSEL/0.8.2',headers={Accept='application/json'}}
 local ok,r
 if payload then opts.headers['Content-Type']='application/json';ok,r=pcall(http.post,'https://api.ggsel.com'..path,json.encode(payload),opts)
 else ok,r=pcall(http.get,'https://api.ggsel.com'..path,opts) end
 if not ok or not r then return json.encode({status='network_error'}) end
 if r.status~=200 then return json.encode({status=r.status==404 and 'product_removed' or 'http_error',http_status=r.status}) end
 local mime=nil;for k,v in pairs(r.headers or {}) do if type(k)=='string' and k:lower()=='content-type' then mime=v end end
 if type(mime)~='string' or not mime:lower():find('application/json',1,true) then return json.encode({status='unexpected_content_type',http_status=r.status}) end
 if type(r.body)~='string' or #r.body>1000000 then return json.encode({status='invalid_response'}) end
 local valid,data=pcall(json.decode,r.body);if not valid or type(data)~='table' then return json.encode({status='invalid_response'}) end
 return json.encode({status='ok',data=data,fetched_at=os.time(),http_status=r.status})
end
local function valid_id(id)return type(id)=='string' and #id<=12 and id:match('^%d+$') end
---@ffi
---@param query string
---@return string
function searchGgselCatalogs(query)
 if type(query)~='string' or #query<2 or #query>180 or query:find('[%c]') then return json.encode({status='invalid_request'}) end
 return request('/elastic/goods/query-categories',{search_term=query,lang='en',limit=5})
end
---@ffi
---@param id string
---@param selection string
---@return string
function getGgselPrice(id,selection)
 if not valid_id(id) or type(selection)~='string' or #selection>2000 then return json.encode({status='invalid_request'}) end
 local ok,options=pcall(json.decode,selection);if not ok or type(options)~='table' then return json.encode({status='invalid_request'}) end
 local pairs_list,n={},0
 for key,value in pairs(options) do
  n=n+1;if n>20 or type(key)~='string' or not key:match('^%d+$') or #key>12 or type(value)~='string' or #value>200 or not value:match('^%d[%d,]*$') then return json.encode({status='invalid_request'}) end
  pairs_list[#pairs_list+1]='&options%5B'..key..'%5D='..value:gsub(',','%%2C')
 end
 table.sort(pairs_list)
 -- Read-only GGSEL calculation endpoint. Never create an order or access credentials.
 return request('/goods/'..id..'/price?currency=RUB&unit_count=1'..table.concat(pairs_list))
end
---@ffi
---@param id string
---@return string
function getGgselReviews(id)
 if not valid_id(id) then return json.encode({status='invalid_request'}) end
 return request('/goods/'..id..'/reviews?page=1&limit=3&lang=en')
end
