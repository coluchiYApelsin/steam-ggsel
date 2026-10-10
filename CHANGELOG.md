# Changelog

## 0.8.1 — 2026-10-11

- Harden checkout handoff with a confirmed selection summary, changed-schema rejection, expired/detached-link protection and an explicitly unknown payment status.
- Reject malformed/duplicate option identifiers and additional payment/authentication secret fields. Preserve real HTTP diagnostics; reject missing HTML MIME and stop catalog discovery on access errors.
- Verify current GGSEL client preselection and visually confirm Ultimate/region on the real merchant page in a separate Steam Browser window without creating an order.
- Research official seller APIs; do not call undocumented buyer/order/payment mutations. Document the remaining partner API requirement and synchronize README/HANDOFF.
- Pass 49 tests / 219 expectations, TypeScript and Starlight verification. See docs/VALIDATION-0.8.1.md and docs/CHECKOUT-RESEARCH.md.

## 0.8.0 — 2026-10-10

- Add real product option controls, in-document selection memory, public GGSEL server quotes and fresh verification before payment. Invalidate stale prices and require confirmation of a changed price.
- Add real buyer reviews, explicit option IDs and region/account/payment distinctions. Reject unavailable, unknown and credential-bearing options.
- Discover actual catalog slugs through public category search; preserve independent catalog/product checks. Normalize punctuation and abbreviations; add reviewed DOOM 2016 AppID binding.
- Retry bypasses local caches. Add fixture-backed option, price failure, checkout recheck, search and Lua API security tests.
- See docs/VALIDATION-0.8.0.md for real Steam results and unverified checkout limitations.

## 0.7.0 — 2026-10-10

- Replace original-site navigation with a full native product page in the current Steam Store DOM. Keep the Steam origin, game nodes and scroll state; no new browsing context while viewing offers.
- Show independently verified live product image, full description, price, seller rating/review counts, edition, activation and region. Resolve long React Flight UTF-8 text records without evaluating scripts.
- Verify seller IDs across localized aliases; require matching product ID/title/category/platform/edition/type. Hide price and checkout on failed verification.
- Remove the old merchant browser shell, CSS hook and context RPC. Only the clearly labelled checkout action opens the real product URL externally; payment logic remains on GGSEL.
- Validate actual native pages in Steam and preserve the existing purchase-block offers. See docs/VALIDATION-0.7.0.md.

## 0.6.0 — 2026-10-10

- Open real GGSEL products in the main Steam Store WebView; add Back/Close and restore game scroll and expanded offers.
- Use the real Millennium browser CSS hook; visually verify product-only Steam styling, leaving checkout and external providers unchanged.
- Fix Indiana alternate catalog parsing; verify incomplete cards against exact product pages, seller statistics, edition, type, region and price.
- Distinguish empty, mismatched, unrecognized and access-blocked responses; validate HTTP status and Content-Type.
- With explicit authorization, fix Clash's steamwebhelper process rule; verify DIRECT GGSEL traffic while OpenAI remains proxied.
- Pass 28 tests / 95 assertions, TypeScript and container checks. Verify both games in real Steam. Checkout/payment remains untested.

## 0.5.1 — 2026-10-10

- Fix the empty purchase heading on current Steam pages: recognize `h2` as well as legacy `h1`. Live diagnostics confirmed the AppID/title/catalog were correct while both purchase headings were empty.
- Treat `bundleid=0` as no bundle; inspect positive package/bundle IDs including attributes on the purchase block itself.
- Recognize only reviewed Cyberpunk 2077 bundle 32470 as Ultimate, including the Russian «Полное издание» heading. Unknown/conflicting bundles and DLC remain excluded.
- Record explicit listing rejection reasons without changing the conservative GGSEL product filters.
- Verify the installed build visually in Steam: four Standard offers and one Ultimate offer, with real prices, sellers and region restrictions. All five product links return HTTP 200.
- Add current Steam heading/form and edition-separation regressions: 20 tests, 63 assertions pass; TypeScript and Starlight verification pass.

## 0.5.0 — 2026-10-10

- Reproduced exit 53; native exit `0xC0000135` and PE imports identify missing `VCRUNTIME140.dll`. Installation of Microsoft's x64 Runtime restores Starlight execution.
- Pin npm Starlight 1.1.6 (bundled native executable reports 1.1.5). Build an explicit `.star` file locally and verify all sections.
- Replace empty provider with direct HTTPS public GGSEL catalog requests through Millennium Lua; no user server, credentials or fabricated data.
- Parse public Next.js hydration JSON without evaluating remote scripts. Require exact catalog title and conservative edition/activation matching.
- Show seller rating separately from product review count, regional conditions, variable prices, sorted offers and expandable additional offers.
- Add loading/error/retry/unconfirmed states, stale navigation response protection, cache expiry, request limits and bounded cache memory.
- Correct required frontend icon, add genuine Millennium type declarations via Starlight LSP, automated Lua/provider/DOM tests, Windows build and installation scripts.
- Fix actual WebView FFI integration: Millennium can return an already decoded object, so JSON is parsed only when the RPC result is a string. Add a regression test for both forms.
- Native Millennium 3.5.0 discovers and runs the `.star`; native Lua HTTP smoke test returns real GGSEL HTML.

## Imported sources

Workspace originally contained 0.4.0 metadata and an intentionally empty backend. Separate 0.4.1 source directories were present in the Steam plugin directory, without a verified compiled plugin. No previous successful build was established.
