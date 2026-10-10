# Confirmed limitations

Current version 0.8.1: see docs/VALIDATION-0.8.1.md and docs/CHECKOUT-RESEARCH.md. Real options and live server pricing work in the native Steam page. The older 0.7.0 notes below are historical and are superseded where the current validation explicitly confirms behavior.

- Original-product option preselection was visually confirmed on the real merchant page for product 5283641 (Ultimate + region). Preservation in a final order remains unconfirmed. Always check parameters and currency on GGSEL. Free text, multiple checkboxes and clearing defaults require re-entry/checking.
- No order is created by the plugin. Payment, authorization, 3DS and checkout are untested.
- Official documentation examined describes seller APIs, not a supported third-party buyer order/payment contract. Internal buy/order mutations are deliberately not called. Trusted status reporting and automatic closing after payment require GGSEL support.
- A target=_blank HTTPS link opened a separate Steam Browser window in the tested installation. Window shape/ownership is not guaranteed across clients. Closing it is not evidence of payment; the plugin reports an unknown status.
- The current schema must match the displayed options before another quote; changed options require reopening the card. This conservative check may also reject harmless availability/label changes.
- S.T.A.L.K.E.R. 2 category search currently returns unrelated/empty results; these are rejected. General localized-title equivalence remains unsupported.
- Variant stock may be unknown; quotes do not reserve goods. Quantity calculators and ambiguous mixed selectors remain unsupported.
- Selection memory lasts only within the current Steam document. Common seller descriptions do not invent per-variant conditions.

Version 0.7.0 uses a native full product page in the existing Steam document. The previous original-site navigation in 0.6.0 did not meet the in-page requirement and has been removed. See docs/VALIDATION-0.7.0.md.

- Alternate catalog cards require product verification, limited to eight candidates; unverified offers remain hidden. Premium is now supported with exact category/edition matching.
- Seller ratings can also come from verified product seller statistics. Localized seller names may differ while the seller ID remains the same.
- No CSS or JavaScript is now injected into GGSEL. Only the explicit checkout action leaves the native Steam product page. Direct checkout API is unavailable; it opens the exact real product URL, where the user selects options and places an order. Checkout, 3DS and payment-provider flows remain untested.
- The authorized local Clash rule directs all steamwebhelper.exe traffic directly. It does not spoof country; cookies, merchant currency and provider policy can still affect available payment methods.

- Visual end-to-end verification passed on the Russian Cyberpunk 2077 Steam page: four Standard offers and one Ultimate offer appear in the correct purchase blocks. Other games, languages and window sizes have not all been visually tested.
- Catalog discovery tries a public ASCII slug derived from the Steam page title, with a reviewed Cyberpunk 2077 AppID override. This is a candidate, not proof: exact catalog title must match. Redirects, nonmatching names, translated titles and missing catalogs fail closed. Coverage is incomplete.
- Edition matching supports exact Standard/Deluxe/Ultimate/Complete/Premium headings and the specifically reviewed Cyberpunk 2077 Ultimate bundle 32470 (including its Russian title). Other bundles, DLC, upgrades, unfamiliar editions and multi-edition seller selectors remain excluded. There is no universal mapping from GGSEL goods to Steam packages/AppIDs.
- GGSEL's public catalog includes only the first server-rendered page. No prohibited search route, access restriction or CAPTCHA is bypassed. Hydration schema is undocumented and may change; malformed/challenge responses hide prices with an error.
- Prices are advertised RUB listing values (`price_wmr`), refreshed after a ten-minute cache. Listings with selectable variants show “от”; regional modifiers, fees and final checkout price are determined on GGSEL. Variant conditions are expandable, not silently treated as worldwide activation.
- Seller ratings come from catalog seller objects or verified product seller statistics. Review counts available in the listing belong to the product, not the seller; seller review counts are not invented.
- Steam Gift `Auto` titles are accepted only when corroborated by observed catalog type 48. This is an observed website convention, not a guaranteed API contract. Unknown activation types are excluded.
- Native page data uses a ten-minute cache. Seller and product review counts are shown separately; individual review text is not retrieved. Missing images/statistics are labelled rather than fabricated. Merchant descriptions are rendered as text, so original decorative markup and inline links are not reproduced.
- The `.star` is unsigned. It was explicitly enabled locally for testing; this does not imply publisher verification or Marketplace distribution approval.
- Windows builds require Microsoft's x64 Visual C++ Runtime. npm Starlight 1.1.6 currently reports native version 1.1.5. This is recorded rather than silently assuming the versions agree.

See README and docs/RESEARCH.md for verification commands and provider evidence.
