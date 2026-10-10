# Confirmed limitations

- Visual end-to-end verification in the Steam purchase page is pending. Millennium discovery, backend startup, native HTTP and DOM behavior are verified independently. Automatic Steam navigation was rejected by the execution policy; manual navigation was requested.
- Catalog discovery tries a public ASCII slug derived from the Steam page title, with a reviewed Cyberpunk 2077 AppID override. This is a candidate, not proof: exact catalog title must match. Redirects, nonmatching names, translated titles and missing catalogs fail closed. Coverage is incomplete.
- Edition matching supports exact Standard/Deluxe/Ultimate/Complete headings. DLC, bundles, upgrades, unfamiliar editions and multi-edition seller selectors remain unconfirmed and are excluded. There is no verified universal mapping from GGSEL goods to Steam packages/AppIDs.
- GGSEL's public catalog includes only the first server-rendered page. No prohibited search route, access restriction or CAPTCHA is bypassed. Hydration schema is undocumented and may change; malformed/challenge responses hide prices with an error.
- Prices are advertised RUB listing values (`price_wmr`), refreshed after a ten-minute cache. Listings with selectable variants show “от”; regional modifiers, fees and final checkout price are determined on GGSEL. Variant conditions are expandable, not silently treated as worldwide activation.
- Seller ratings come only from the nested seller object. Review counts available in the listing belong to the product, not the seller; seller review counts are not invented.
- Steam Gift `Auto` titles are accepted only when corroborated by observed catalog type 48. This is an observed website convention, not a guaranteed API contract. Unknown activation types are excluded.
- Links open real GGSEL product pages. Embedded Steam browser behavior has not been visually verified. No documented safe direct-checkout API was established; the plugin does not guess payment URLs or enter order/payment data.
- The `.star` is unsigned. It was explicitly enabled locally for testing; this does not imply publisher verification or Marketplace distribution approval.
- Windows builds require Microsoft's x64 Visual C++ Runtime. npm Starlight 1.1.6 currently reports native version 1.1.5. This is recorded rather than silently assuming the versions agree.

See README and docs/RESEARCH.md for verification commands and provider evidence.
