# Third-party software and licensing

No project LICENSE was found in the existing working tree or Git history. This document does not assign a license to Steam × GGSEL. Publishing source does not itself resolve permission to redistribute all contributions under an open-source license; the copyright holder must make that choice.

Audit date: 2026-10-11. Dependencies are pinned by `package.json`/`bun.lock`; `node_modules`, downloaded developer tools, diagnostics and build output are excluded from Git publication.

| Dependency / tool | Observed license / source |
| --- | --- |
| Millennium / Starlight | Upstream Millennium repository MIT, Copyright (c) 2026 Project Millennium. npm `@steambrew/starlight` 1.1.6 itself omitted a package license field/file; upstream root license was checked independently. Preserve the upstream notice when distributing its code or substantial portions. |
| @msgpack/msgpack 3.1.3 | ISC |
| TypeScript 5.9.3 | Apache-2.0; package includes ThirdPartyNoticeText |
| fengari 0.1.5, happy-dom 20.14.6 | MIT |
| @types/bun, @types/node, @types/react, @types/react-dom, @types/whatwg-mimetype, @types/ws | MIT |
| bun-types, csstype, buffer-image-size, readline-sync, tmp, undici-types, whatwg-mimetype, ws | MIT |
| entities | BSD-2-Clause |
| sprintf-js | BSD-3-Clause |

All 21 installed dependency package manifests were inspected locally; detailed results remain in ignored `diagnostics/dependency-license-audit.json`. Development-only dependencies are not copied into the published source. Their upstream notices must remain with any redistributed dependency copies. Microsoft Visual C++ Runtime is linked from Microsoft, not vendored. Bun, Node, Git and GitHub CLI executables are not published with the project.

Millennium license source: https://github.com/SteamClientHomebrew/Millennium/blob/main/LICENSE.md. A verbatim upstream notice is retained in `third_party/Millennium-LICENSE.txt`; it is a third-party notice, not the project's license.

GGSEL catalog/product fixtures are reduced public read-only snapshots for parser regression tests. They provide no license to GGSEL branding, seller descriptions, images or reviews. Runtime data is fetched from the real provider; no merchant HTML/JS is executed in Steam. GGSEL and Steam marks remain their respective owners' property. This independent project does not imply endorsement or permission for an undocumented buyer API.
