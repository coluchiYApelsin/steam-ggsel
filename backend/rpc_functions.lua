local json = require("json")
local http = require("http")
local cache = {}
local last_request = 0
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
        user_agent = "Steam-GGSEL/0.5.0 (public catalog comparison)",
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
    else
        result = { status = "ok", html = response.body, fetched_at = now,
            catalog_title = expected, source = "https://ggsel.net/en/catalog/" .. slug }
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
