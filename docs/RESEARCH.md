# Investigation — 2026-10-10

## Windows exit 53

Original `bun run build` reproducibly returned 53 outside Steam/Program Files. Direct native `--help` returned signed `-1073741515` = unsigned `0xC0000135` (DLL loader failure), before reading configuration or Lua. `scripts/pe-imports.cjs` lists `VCRUNTIME140.dll` as a direct import; the file was absent from System32. Only similarly named CLR-specific DLLs were present, which are not replacements.

After the user installed [Microsoft Visual C++ Redistributable x64](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist), System32 contained VCRUNTIME140.dll 14.44.35211.0; the same executable started and compiled. This confirms the missing runtime as the cause in this environment. Bun truncates the native Windows status to its low byte, 53. Neither a conflicting unscoped package nor the source directory was needed to reproduce the failure.

Installed npm package: @steambrew/starlight 1.1.6, engine Node >=16; native `--version`: 1.1.5. Tested with Bun 1.4.2 and Node 24.21.0. Millennium DLL reports 3.5.0. [Starlight CLI source](https://github.com/SteamClientHomebrew/Millennium/blob/main/starlight/src/main.rs) confirms pack/verify/inspect commands; [configuration reference](https://docs.steambrew.app/plugins/structure/config) describes literal output_path. A path named `dist` was an artifact file, not a directory; final configuration uses `dist/steam-ggsel.star`.

## GGSEL access

- [Seller API](https://seller.ggsel.com/docs/v2/list-products) requires an API key and describes a seller's inventory for a specific offer. It is not an anonymous cross-seller search API; no seller credentials are requested.
- Direct GET of the [public Cyberpunk catalog](https://ggsel.net/en/catalog/cyberpunk-2077) returned HTTP 200 without cookies, authentication or challenge solving. Server-rendered Next.js Flight JSON contained 60 unique listing records, including nested seller objects, RUB/USD/EUR prices, seller ratings, product review counts, activation clues and order options.
- The adapter consumes these ordinary public page responses through [Millennium's Lua HTTP client](https://docs.steambrew.app/plugins/lua/http). Public website hydration is undocumented; it is not represented as an official stable API. No private endpoint or hidden credential is used.
- [robots.txt](https://ggsel.net/robots.txt) permits ordinary catalog reading but disallows `/search/` and `/en/search/`; those paths are not queried. A 403/429/redirect/challenge causes an explicit error and cooldown, not alternate clients, proxies or challenge bypasses.
- The [public offer](https://ggsel.net/en/public-offer) describes reviewing seller listings and following payment services. It does not establish a stable developer API or a general redistribution license. A published commercial integration should seek a maintained partner catalog feed/license from GGSEL if broader coverage or guaranteed availability is required. That feed could be consumed locally through the same Lua adapter; a separate user server is unnecessary.

## Matching and checkout

The catalog mixes GOG, console accounts, Steam Gifts, rentals, DLC and bundles. A catalog's minimum price is not the price of the Steam base game. The implementation never uses AggregateOffer minima as actual offers. Exact page/catalog title, understood title tokens, explicit Steam platform and edition all have to agree; non-region radio selectors are excluded. Matches are labelled as based on names, not guaranteed package identity. Unknown regional coverage is displayed explicitly.

Seller rating is read from `seller.rating`, never substituted by a product rating or review count. `cnt_responses` is labelled as product reviews. Real product URL slugs must end in the listing's numeric ID. Listing/payment URLs are not guessed: only validated GGSEL product pages are linked. There is no order creation or direct-payment action. The ordinary anchor lets Steam's browser/link handling choose the target; its actual behavior remains a visual verification item.

## Runtime evidence

The local Millennium MEP socket returned the plugin's metadata, `enabled: true`, `running: true`, and its on_load readiness log. A temporary isolated smoke plugin using the same Lua provider fetched real GGSEL HTML (`status=ok`, approximately 936 kB); it was disabled and its generated artifact removed afterward. MEP reported no plugin JavaScript messages or runtime exceptions at that point. Absence of errors alone is not proof of DOM injection.

A later actual Steam WebView call for ARC Raiders revealed that Millennium's FFI had already decoded the Lua JSON return value. An unconditional JSON.parse failed with `[object Object] is not valid JSON`. The client now accepts either an object or a JSON string, with a regression test. The provider did return HTTP data through actual WebView → Lua → GGSEL → WebView IPC; visual rendering after this correction still requires a fresh game page.

Reduced public listing fixtures exist only under tests/fixtures. They are never packaged as live prices. `bun scripts/check-live.ts` independently requests fresh data and rejects a response with fewer than three usable offers. No purchases were performed.

## Cyberpunk purchase matching, 0.5.1

Live Russian Steam diagnostics identified an empty purchase heading: current markup uses `h2`, whereas the old selector looked for `h1`. The game title and AppID were correct, and real GGSEL catalog data reached the widget. The base purchase carries package 367653; the full-edition block carries bundle 32470. Recognition now supports current headings, treats zero bundle IDs as absent, and accepts only the reviewed bundle with the exact expected game and edition title.

Steam's [Ultimate Edition bundle 32470](https://store.steampowered.com/bundle/32470/?l=english) contains Cyberpunk 2077 and Phantom Liberty. This specific bundle maps to GGSEL Ultimate, including the Russian Steam title «Полное издание»; arbitrary bundles are still rejected. Live visual verification now passed with four Standard and one Ultimate offer. See VALIDATION-0.5.1.md for prices, rejection counts and artifact hash.
# 0.7.0: native in-page product view

The 0.6.0 original-site navigation did not satisfy the user's requirement and is superseded. GGSEL's actual CSP blocks Steam iframe embedding. The examined Millennium Lua/WebKit APIs provide hooks into existing documents, not a supported embedded WebView component in a Store page. Variant B therefore renders a full page in the current Steam DOM, retaining the Steam origin and original game nodes. No CSP/same-origin restrictions are bypassed. Merchant CSS hooks and external-page injection were removed. Only explicitly labelled checkout opens the exact original product URL. See VALIDATION-0.7.0.md for current evidence.

# 0.6.0 research supplement (historical)

GGSEL CSP frame-ancestors prevents embedding in a Steam iframe. Top-level navigation in the existing Store WebView was verified instead. Native Millennium implements foreign-domain injection via registered hooks; the real Lua add_browser_css API is used and its path resolves under Millennium/themes. The framework manages its own isolated world/CSP behavior; this plugin does not implement an iframe bypass or alter merchant response headers.

Primary sources:
- https://github.com/SteamClientHomebrew/Millennium/blob/main/src/engine/plugin_webkit_world_mgr.cc
- https://github.com/SteamClientHomebrew/Millennium/blob/main/src/engine/target_url.cc
- https://github.com/SteamClientHomebrew/Millennium/blob/main/src/bindings/webkit.cc
- https://github.com/SteamClientHomebrew/Millennium/blob/main/src/lua_host/api/millennium.cc
- https://github.com/clash-verge-rev/clash-verge-rev.github.io/blob/main/docs/guide/rules.md

Indiana returned HTTP 200 text/html and 61 goods; its alternative template omitted nested seller/options. Exact product verification fixes the parser without weakening matching. Windows proxy was enabled on localhost:7897, TUN disabled. With explicit authorization the incorrect DOMAIN rule was replaced by PROCESS-NAME in persistent and active Clash configurations. Core connections confirm GGSEL DIRECT and OpenAI still proxied. Private backups are excluded from releases. Full evidence: VALIDATION-0.6.0.md.

