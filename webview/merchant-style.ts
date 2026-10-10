// Only GGSEL product pages opt into these existing GGSEL design tokens.
// No display/visibility rules, form replacements, or payment-provider selectors.
export const PRODUCT_CSS=`
html[data-steam-ggsel-product="true"]{
 --ggsel-Background-Primary:#1b2838;--ggsel-Background-Secondary:#243447;
 --ggsel-Background-Tertiary:#2a475e;--ggsel-Background-Brand:#75b022;
 --ggsel-Background-Accent:#75b022;--ggsel-Background-Disabled:#405467;
 --ggsel-Text-and-Icon-Primary:#c7d5e0;--ggsel-Text-and-Icon-Secondary:#9aabba;
 --ggsel-Text-and-Icon-Accent:#66c0f4;--ggsel-Text-and-Icon-Disabled:#899aaa;
 --ggsel-Text-and-Icon-OnColor:#fff;--ggsel-Border-Primary:#405467;
 --ggsel-Extensions-Background-Surface:#243447;--ggsel-Extensions-Background-InversePrimary:#405467;
 --ggsel-Extensions-Background-AlwaysLight:#243447;--ggsel-Extensions-Text-and-Icon-AlwaysDark:#c7d5e0;
 --ggsel-Accent-Colors-Green:#75b022;--ggsel-Accent-Colors-Green-Light:#355521;
 --ggsel-Extensions-Border-Selected:#66c0f4;--logo-wordmark-color:#c7d5e0;
 --ggsel-Typography-Font-Family:Arial,sans-serif;
 --ggsel-Typography-Font-Family-Header:Arial,sans-serif;
 background:#1b2838;color:#c7d5e0;
}
html[data-steam-ggsel-product="true"] body,
html[data-steam-ggsel-product="true"] [data-testid="product-content"]{background:#1b2838!important;color:#c7d5e0}
html[data-steam-ggsel-product="true"] [class*="ProductBuyBlock-"][class*="__wrapper"]{background:#243447!important;border:1px solid #405467;border-radius:8px}
html[data-steam-ggsel-product="true"] [class*="BuyButton-"][class*="__button"]{background:linear-gradient(to right,#75b022,#588a1b)!important;color:#fff!important;border-radius:4px}
html[data-steam-ggsel-product="true"] [class*="ProductPrice-"][class*="__price"]{color:#beee11}
html[data-steam-ggsel-product="true"] [data-testid="product-content"] a{color:#66c0f4}
`;
