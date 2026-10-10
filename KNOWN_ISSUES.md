# Confirmed limitations

Current 0.6.0 evidence supersedes the older browser limitation below: real products open in the main Steam Store WebView; product CSS, Back/Close and scroll restoration pass visual checks. Indiana shows three Standard and one Premium offer. Real checkout, 3DS and external provider flows remain untested; original site popups may still open separate windows. See docs/VALIDATION-0.6.0.md.

- Alternate catalog cards require product verification, limited to eight candidates; unverified offers remain hidden. Premium is now supported with exact category/edition matching.
- Seller ratings can also come from verified product seller statistics. Localized seller names may differ while the seller ID remains the same.
- CSS applies only to GGSEL product routes, disables on checkout and never targets external payment domains.
- The authorized local Clash rule directs all steamwebhelper.exe traffic directly. It does not spoof country; cookies, merchant currency and provider policy can still affect available payment methods.

- Visual end-to-end verification passed on the Russian Cyberpunk 2077 Steam page: four Standard offers and one Ultimate offer appear in the correct purchase blocks. Other games, languages and window sizes have not all been visually tested.
- Catalog discovery tries a public ASCII slug derived from the Steam page title, with a reviewed Cyberpunk 2077 AppID override. This is a candidate, not proof: exact catalog title must match. Redirects, nonmatching names, translated titles and missing catalogs fail closed. Coverage is incomplete.
- Edition matching supports exact Standard/Deluxe/Ultimate/Complete/Premium headings and the specifically reviewed Cyberpunk 2077 Ultimate bundle 32470 (including its Russian title). Other bundles, DLC, upgrades, unfamiliar editions and multi-edition seller selectors remain excluded. There is no universal mapping from GGSEL goods to Steam packages/AppIDs.
- GGSEL's public catalog includes only the first server-rendered page. No prohibited search route, access restriction or CAPTCHA is bypassed. Hydration schema is undocumented and may change; malformed/challenge responses hide prices with an error.
- Prices are advertised RUB listing values (`price_wmr`), refreshed after a ten-minute cache. Listings with selectable variants show “от”; regional modifiers, fees and final checkout price are determined on GGSEL. Variant conditions are expandable, not silently treated as worldwide activation.
- Seller ratings come from catalog seller objects or verified product seller statistics. Review counts available in the listing belong to the product, not the seller; seller review counts are not invented.
- Steam Gift `Auto` titles are accepted only when corroborated by observed catalog type 48. This is an observed website convention, not a guaranteed API contract. Unknown activation types are excluded.
- Links open real GGSEL product pages. Main-window product navigation is visually verified in 0.6.0. No documented safe direct-checkout API was established; the plugin does not guess payment URLs or enter order/payment data.
- The `.star` is unsigned. It was explicitly enabled locally for testing; this does not imply publisher verification or Marketplace distribution approval.
- Windows builds require Microsoft's x64 Visual C++ Runtime. npm Starlight 1.1.6 currently reports native version 1.1.5. This is recorded rather than silently assuming the versions agree.

See README and docs/RESEARCH.md for verification commands and provider evidence.
