local json = require("json")
local http = require("http")
local cache = {}
local last_request = 0
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
---@ffi
---@param appid string
---@param title string
---@return string
function getGgselOffers(appid, title)
    appid = tostring(appid)
    if not appid:match("^%d+$") or #appid > 10 or type(title) ~= "string" or #title < 2 or #title > 150 then
        return json.encode({ status = "invalid_request" })
    end
    local slug = catalogs[appid]
    if not slug then
        -- A normal public page request, not the disallowed /search/ endpoint.
        -- The webview MUST verify the returned catalog's exact title before showing prices.
        slug = title:lower():gsub("[^a-z0-9]+", "-"):gsub("^%-+", ""):gsub("%-+$", "")
        if #slug < 2 or #slug > 100 then return json.encode({ status = "unsupported_game" }) end
    end
    local expected = appid == "1091500" and "Cyberpunk 2077" or title
    local cache_key = appid .. ":" .. expected
    local now = os.time()
    local hit = cache[cache_key]
    if hit and hit.expires > now then return hit.value end
    if now - last_request < 3 then return json.encode({ status = "rate_limited" }) end
    last_request = now
    local ok, response = pcall(http.get, "https://ggsel.net/en/catalog/" .. slug, {
        timeout = 15, follow_redirects = false, verify_ssl = true,
        user_agent = "Steam-GGSEL/0.7.0 (public catalog comparison)",
        headers = { ["Accept"] = "text/html" },
    })
    local result
    if not ok or not response then
        result = { status = "network_error" }
    elseif response.status == 404 then
        result = { status = "unsupported_game" }
    elseif response.status ~= 200 then
        result = { status = "http_error", http_status = response.status }
    elseif type(response.body) ~= "string" or #response.body > 3000000 then
        result = { status = "invalid_response" }
    elseif content_type(response) and not content_type(response):find("text/html", 1, true) then
        result = { status = "unexpected_content_type" }
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
---@ffi
---@param id string
---@param slug string
---@return string
function getGgselProduct(id, slug)
    if type(id) ~= "string" or not id:match("^%d+$") or #id > 12 or type(slug) ~= "string" or #slug > 250 or not slug:match("^[a-z0-9%-]+$") or slug:sub(-#id-1) ~= "-" .. id then
        return json.encode({status="invalid_request"})
    end
    local now=os.time()
    local hit=product_cache[id]
    if hit and hit.slug == slug and hit.expires>now then return hit.value end
    if now-product_window>=60 then product_window=now;product_count=0 end
    if product_count>=12 then return json.encode({status="rate_limited"}) end
    product_count=product_count+1
    local ok,r=pcall(http.get,"https://ggsel.net/en/catalog/product/"..slug,{
        timeout=12,follow_redirects=false,verify_ssl=true,user_agent="Steam-GGSEL/0.7.0 (public product verification)",headers={Accept="text/html"}})
    local result
    if not ok or not r then result={status="network_error"}
    elseif r.status~=200 then result={status="http_error",http_status=r.status}
    elseif type(r.body)~="string" or #r.body>3000000 then result={status="invalid_response"}
    elseif content_type(r) and not content_type(r):find("text/html",1,true) then result={status="unexpected_content_type"}
    else result={status="ok",html=r.body,fetched_at=now} end
    local count=0
    for key,value in pairs(product_cache) do if value.expires<=now then product_cache[key]=nil else count=count+1 end end
    if count>=12 then product_cache={} end
    local value=json.encode(result)
    product_cache[id]={slug=slug,value=value,expires=now+(result.status=="ok" and 600 or 30)}
    return value
end

