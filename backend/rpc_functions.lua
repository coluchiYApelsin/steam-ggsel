local json = require("json")
local http = require("http")
local cache = {}
local last_request = 0
local catalog_window,catalog_count=0,0
local function content_type(response)
    for key,value in pairs(response.headers or {}) do
        if type(key)=="string" and key:lower()=="content-type" and type(value)=="string" then return value:lower() end
    end
    return nil
end
-- Reviewed overrides. Other public catalog paths are candidates, never confirmed matches.
local catalogs = {
    ["1091500"] = "cyberpunk-2077",
}
local function catalog_request(appid, title, catalog, refresh)
    appid = tostring(appid)
    if not appid:match("^%d+$") or #appid > 10 or type(title) ~= "string" or #title < 2 or #title > 150 then
        return json.encode({ status = "invalid_request" })
    end
    local slug = catalog or catalogs[appid]
    if catalog and (type(catalog)~='string' or #catalog>150 or not catalog:match('^[a-z0-9%-]+$')) then return json.encode({status='invalid_request'}) end
    if not slug then
        -- A normal public page request, not the disallowed /search/ endpoint.
        -- The webview MUST verify the returned catalog's exact title before showing prices.
        slug = title:lower():gsub("[^a-z0-9]+", "-"):gsub("^%-+", ""):gsub("%-+$", "")
        if #slug < 2 or #slug > 100 then return json.encode({ status = "unsupported_game" }) end
    end
    local expected = appid == "1091500" and "Cyberpunk 2077" or title
    local cache_key = appid .. ":" .. expected .. ':' .. slug
    local now = os.time()
    local hit = cache[cache_key]
    if not refresh and hit and hit.expires > now then return hit.value end
    if now-catalog_window>=60 then catalog_window=now;catalog_count=0 end
    if catalog_count>=20 or (not catalog and not refresh and now-last_request<3) then return json.encode({status='rate_limited'}) end
    catalog_count=catalog_count+1
    last_request = now
    local ok, response = pcall(http.get, "https://ggsel.net/en/catalog/" .. slug, {
        timeout = 15, follow_redirects = false, verify_ssl = true,
        user_agent = "Steam-GGSEL/0.8.2 (public catalog comparison)",
        headers = { ["Accept"] = "text/html" },
    })
    local result
    if not ok or not response then
        result = { status = "network_error" }
    elseif response.status == 404 then
        result = { status = "unsupported_game", http_status = response.status }
    elseif response.status ~= 200 then
        result = { status = "http_error", http_status = response.status }
    elseif type(response.body) ~= "string" or #response.body > 3000000 then
        result = { status = "invalid_response" }
    elseif not content_type(response) or not content_type(response):find("text/html", 1, true) then
        result = { status = "unexpected_content_type", http_status = response.status }
    else
        result = { status = "ok", html = response.body, fetched_at = now,
            catalog_title = expected, source = "https://ggsel.net/en/catalog/" .. slug,
            http_status = response.status, content_type = content_type(response) }
    end
    local value = json.encode(result)
    -- Bound memory without writing browsing history to disk.
    local count = 0
    for key, entry in pairs(cache) do
        if entry.expires <= now then cache[key] = nil else count = count + 1 end
    end
    if count >= 8 then cache = {} end
    cache[cache_key] = { value = value, expires = now + (result.status == "ok" and 600 or 30) }
    return value
end

local product_cache = {}
local product_window, product_count = 0, 0
local function product_request(id, slug, refresh)
    if type(id) ~= "string" or not id:match("^%d+$") or #id > 12 or type(slug) ~= "string" or #slug > 250 or not slug:match("^[a-z0-9%-]+$") or slug:sub(-#id-1) ~= "-" .. id then
        return json.encode({status="invalid_request"})
    end
    local now=os.time()
    local hit=product_cache[id]
    if not refresh and hit and hit.slug == slug and hit.expires>now then return hit.value end
    if now-product_window>=60 then product_window=now;product_count=0 end
    if product_count>=30 then return json.encode({status="rate_limited"}) end
    product_count=product_count+1
    local ok,r=pcall(http.get,"https://ggsel.net/en/catalog/product/"..slug,{
        timeout=12,follow_redirects=false,verify_ssl=true,user_agent="Steam-GGSEL/0.8.2 (public product verification)",headers={Accept="text/html"}})
    local result
    if not ok or not r then result={status="network_error"}
    elseif r.status~=200 then result={status="http_error",http_status=r.status}
    elseif type(r.body)~="string" or #r.body>3000000 then result={status="invalid_response"}
    elseif not content_type(r) or not content_type(r):find("text/html",1,true) then result={status="unexpected_content_type",http_status=r.status}
    else result={status="ok",html=r.body,fetched_at=os.time(),http_status=r.status} end
    local count=0
    for key,value in pairs(product_cache) do if value.expires<=now then product_cache[key]=nil else count=count+1 end end
    if count>=16 then product_cache={} end
    local value=json.encode(result)
    product_cache[id]={slug=slug,value=value,expires=now+(result.status=="ok" and 600 or 30)}
    return value
end

---@ffi
---@param appid string
---@param title string
---@param catalog string
---@param refresh boolean
---@return string
function getGgselCatalog(appid,title,catalog,refresh)
 if catalog=='' then catalog=nil end
 return catalog_request(appid,title,catalog,refresh)
end
---@ffi
---@param id string
---@param slug string
---@return string
function getGgselProductFresh(id,slug)
 return product_request(id,slug,true)
end

---@ffi
---@param appid string
---@param title string
---@return string
function getGgselOffers(appid,title)
 return catalog_request(appid,title,nil,false)
end
---@ffi
---@param id string
---@param slug string
---@return string
function getGgselProduct(id,slug)
 return product_request(id,slug,false)
end
