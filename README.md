# aimees-papercraft-world — RE & Vercel deployment

Reverse-engineering notes and a production deployment for
[aimees-papercraft-world.com](https://aimees-papercraft-world.com), a Codrops/FWA
papercraft portfolio built with React Three Fiber and a WebGPU renderer.

**Live deployment:** https://aimees-papercraft-world-sooty.vercel.app

## Contents

| Path | What it is |
|---|---|
| [`papercraft-re/REPORT.md`](papercraft-re/REPORT.md) | Full analysis: stack fingerprint, architecture, asset container validation, findings, payload budget |
| [`papercraft-re/data/assets.csv`](papercraft-re/data/assets.csv) | Per-file size, magic-byte header, detected format, and whether each asset is actually served |

## Summary

The site was rebuilt from its MIT-licensed source
([`andrewwoan/aimee-xus-papercraft-world`](https://github.com/andrewwoan/aimee-xus-papercraft-world)) —
the sandbox could not reach the domain directly, and the source is credited in the page footer.

**Stack:** Vite 7.3 · React 19 · three.js 0.182 via `@react-three/fiber` 9.5 ·
`WebGPURenderer` + TSL · GSAP ScrollTrigger · Lenis · Zustand

**Notable findings:**

1. The KTX2 texture pipeline is dead code — `ktxLoader.jsx` branches on `.ktx2`, but all 16 call
   sites pass `.webp`, leaving 12 MB of `public/images/` and 580 KB of `public/basis/` unfetched.
2. `favicon.svg` is 28 MB — an SVG wrapping a base64 PNG, and 45% of the total payload.
3. `site.webmanifest` references `/web-app-manifest-*.png` while the files live at `/media/…`, so
   PWA installability is broken.
4. A single 2.0 MB JS chunk (581 KB gzip) gates the loading screen on all four scenes.

Fixing (1) and (2) takes the deployed payload from ~63 MB to ~23 MB with no visual change. Details
and the reasoning behind each finding are in the report.

## Deployment notes

The Vercel project (`aimees-papercraft-world`) is bound to the **upstream** repository, because a
repository could not be created under this account during the session. The fixes above therefore
cannot be applied through the current Vercel project, and a push upstream would change the deployed
site. To own the code: add the repo to the Vercel GitHub App and redeploy from your own copy.
