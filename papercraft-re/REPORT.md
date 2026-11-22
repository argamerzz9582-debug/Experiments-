# Aimee Xu's Papercraft World — RE Report & Vercel Deployment

**Target:** https://aimees-papercraft-world.com
**Date:** 2026-11-22
**Live deployment:** https://aimees-papercraft-world-sooty.vercel.app
**Vercel project:** `aimees-papercraft-world` (`prj_sI84WSjs1YknG0L8JlfriSUA59QK`)
**Deployment ID:** `dpl_Gz1E9pasypwMfP6brH9wyqjb98iA` — state `READY`, `PROMOTED` to production

---

## 1. Method

Direct HTTP was unavailable for this domain from the sandbox: DNS resolved to Vercel edge IPs
(`216.150.1.65`, `216.150.1.129`) and TCP:443 connected, but the TLS handshake died with
`SSL_ERROR_SYSCALL` — egress filtering, not a site fault. The site was therefore reached two ways:

1. **Sanctioned source retrieval.** The page footer credits
   [github.com/andrewwoan/aimee-weis-papercraft-world](https://github.com/andrewwoan/aimee-weis-papercraft-world)
   as the full source (MIT licensed). The repo was cloned, so the analysis rests on real source and
   original assets rather than a minified scrape.
2. **Reproducible build.** `npm install && npm run build` locally, then the artifacts themselves were
   the analysis target (bundle, asset containers, magic bytes).

The `decompile` toolchain (installed earlier this session) was used for the triage pass.

---

## 2. Stack fingerprint

| Layer | Finding |
|---|---|
| Build tool | **Vite 7.3.1**, `@vitejs/plugin-react` 5.1.1 |
| UI | **React 19.2** (`StrictMode`, `createRoot`) |
| 3D | **three.js 0.182** via **`@react-three/fiber` 9.5** + `@react-three/drei` 10.7 |
| Renderer | **`WebGPURenderer`** imported from `three/webgpu`, with `three/tsl` for node-based shaders |
| Animation | **GSAP 3.14** (+ `@gsap/react`, `ScrollTrigger`) |
| Smooth scroll | **Lenis 1.3**, driven from the GSAP ticker |
| State | **Zustand 5.0** — four small stores (`useExperienceStore`, `useCameraStore`, `useCurveProgressStore`, `useResponsiveStore`) |
| Deploy target | Static SPA, `dist/` output |

### Why this matters
The renderer is created asynchronously:

```js
gl={async (props) => {
  const renderer = new THREE.WebGPURenderer({ ...props, logarithmicDepthBuffer: true });
  await renderer.init();
  return renderer;
}}
```

`WebGPURenderer` falls back to a WebGL2 backend where WebGPU is unavailable, so the site is not
WebGPU-only. Three.js also self-hosts its shader chunks and TSL inside the JS bundle — the page
makes **no third-party network requests at runtime**.

---

## 3. Application architecture

```
App.jsx
├── LoadingScreen      progress gate, hover-reactive paper head
├── InfoPanel          GSAP-scaled panel; opens/closes the canvas framing
├── InfoButton
├── ZoomSlider         writes useCameraStore.zoom
├── Border             full-page paper border, scales with the canvas
└── Experience.jsx     <Canvas> + Lenis + GSAP ScrollTrigger
    └── Scene.jsx
        ├── CustomCamera          camera driven by a Catmull-Rom curve + scroll progress
        ├── Moving_Characters     glTF characters (slime, dragonair, guoba…)
        ├── Scene_1_Winter … Scene_4_Fall
        └── SceneReadySentinel    compileAsync() then 3 rAF frames before reveal
```

**Scroll model.** A `1000vh` spacer div with `pointer-events: none` provides scroll distance. Lenis
emits `scroll` → `setScrollProgress(e.progress)` → `useCurveProgressStore`. The camera samples a curve
at that progress. Each of the four scenes occupies a segment, so scrolling *is* the navigation
(the page's own copy says "Swipe/Scroll to navigate").

**Render-readiness guard.** `SceneReadySentinel` calls `gl.compileAsync?.(scene, camera)` and waits
three animation frames before flipping `isSceneReady`. This prevents the black first frames that a
naive WebGPU canvas shows while pipelines compile — a real, practical bug fix.

**Responsive branch.** `useResponsiveStore` is a module-level `window.innerWidth < 764` listener, so
`isMobile` is captured at import time and kept in sync by a resize handler. GSAP builds a different
scale/border timeline for mobile (0.4 scale, `center 160px` origin) vs desktop (0.6, `20px center`).

---

## 4. Asset container analysis

All containers validated by magic bytes:

| Asset | Bytes | Header | Verdict |
|---|---|---|---|
| `models/*.glb` (5) | 2.9 MB | `67 6c 54 46 02 00 00 00` | glTF **2.0** binary, valid |
| `textures/*.webp` (16) | 18 MB | `52 49 46 46 … 57 45 42 50` | RIFF/**WEBP**, valid |
| `basis/basis_transcoder.wasm` | 527 KB | `00 61 73 6d 01 00 00 00` | **WebAssembly** v1, valid |
| `basis/basis_transcoder.js` | — | — | Basis Universal transcoder glue |
| `fonts/SlimeBox.woff2` | 18.5 KB | `77 4f 46 32` | **WOFF2**, valid |
| `media/og-image.webp` | 527 KB | `52 49 46 46 … 57 45 42 50` | WEBP social card, valid |
| `images/*.ktx2` (19) | 12 MB | `ab 4b 54 58 20 32 30` | **KTX2** + Basis supercompressed, valid — *unused, see §5* |

Models were pre-optimised with `gltfjsx … -T -j -M`: e.g. `Scene_1_Winter.glb` 2.79 MB → 225 KB
(92% reduction) via Draco + texture transforms.

**Encoding chain.** Blender → glTF → `gltfjsx`/`gltf-transform` (Draco, meshopt, WebP) → three.js
`GLTFLoader` + `DRACOLoader` + `KTX2Loader`.

---

## 5. Findings

### 5.1 The KTX2 pipeline is dead code — 12 MB of unused payload
`src/Experience/utils/ktxLoader.jsx` exports `useKTX2Texture`, which branches on
`textureUrl.endsWith(".ktx2")` and calls `loader.setTranscoderPath("/basis/")` with
`KTX2Loader.detectSupport(gl)`. Real source, really wired up.

But **all 16 call sites pass `.webp`**:

```
/textures/Scene_1_Winter_1.webp     /textures/Scene_2_Spring_1.webp
/textures/Scene_3_Summer_1.webp     /textures/Scene_4_Fall_1.webp   …
```

Grep for `.ktx2` in `src/` returns only the two `endsWith` guards — no asset path ever ends in
`.ktx2`. Consequences:

- `public/images/*.ktx2` (19 files, **12 MB**) is never fetched.
- `public/basis/` (580 KB: transcoder `.js` + `.wasm`) is never fetched.
- The bundle still *ships* `KTX2Loader` + the transcoder glue (3 matches in `dist/assets/index-*.js`),
  so bundle weight carries code that cannot execute.
- Conversely, `public/textures/` (16 WebP, 18 MB) is the **real** texture set and is easy to miss
  because `public/` also contains the decoy `images/` tree.

**Fix:** delete `public/images/` and `public/basis/`, drop the KTX2 branch from `ktxLoader.jsx`
(renaming it `useTexture`), and let the bundler tree-shake `KTX2Loader`. Saves ~12.6 MB of transfer
plus the loader module — with zero visual change.

### 5.2 `favicon.svg` is 28 MB
`public/media/favicon.svg` — an SVG with an embedded base64 PNG, 28 MB for an icon. It is linked from
`<head>` as a `<link rel="icon" type="image/svg+xml">`, so every browser that honours it downloads
28 MB before first paint. This single file is **45% of the entire 63 MB payload**. It should be a
few KB. (The 96×96 PNG and `.ico` siblings are correctly sized; only the SVG is pathological.)

### 5.3 Web app manifest points at files that do not exist
`public/media/site.webmanifest` declares icons at root paths:

```json
"src": "/web-app-manifest-192x192.png"   // actual file: /media/web-app-manifest-192x192.png
"src": "/web-app-manifest-512x512.png"
```

Both 404 as written, so PWA installability is broken on every platform. Also still carries the
placeholder `"name": "MyWebSite"` / `"short_name": "MySite"`. `index.html` additionally references
`/vite.svg` (present, but Vite's default logo, not the project's).

### 5.4 Single 2.0 MB JS chunk
`dist/assets/index-DJXGcbMF.js` = 2,003 KB (581 KB gzip) against Vite's 500 KB warning. three.js
plus the WebGPU node system dominate. The four scenes are statically imported, so the loading screen
must wait for all four before it can show progress meaningfully.
Worth splitting per-scene behind `React.lazy`, or adding `build.rollupOptions.output.manualChunks`
to separate `three` from app code.

### 5.5 Clean checks (no findings)
Deliberately verified, nothing found:

- **No trackers or beacons.** `google-analytics`, `gtag`, `googletagmanager`, `hotjar`, `mixpanel`,
  `segment.io`, `sentry`, `facebook.net`, `clarity.ms`, `vercel/insights` → all zero matches in the
  built bundle.
- **No secrets.** No `api_key` / `secret` / `token` / `password` / `sk_live` / `AIza` / `ghp_` matches in `src/` or `index.html`.
- **No third-party runtime hosts.** The only URLs in the bundle are documentation/spec links
  (`w3.org`, `react.dev`, `gsap.com`, `docs.pmnd.rs`, `jcgt.org`, `shadertoy.com`, `tympanus.net`,
  `youtube.com`), none of which are fetched.
- **No auth, cookies, localStorage, or forms** — no user data collected. The site is a pure static
  experience, which is why cloning it is uncontroversial.

---

## 6. Payload budget (built output: 63 MB)

| Directory | Size | Served? |
|---|---|---|
| `media/` | 29 MB | yes — **28 MB is the favicon** |
| `textures/` | 18 MB | yes (the real textures) |
| `images/` | 12 MB | **no — dead KTX2** |
| `models/` | 2.9 MB | yes |
| `basis/` | 580 KB | **no — dead transcoder** |
| `fonts/` | 44 KB | yes |
| `assets/` (JS+CSS) | 2.0 MB | yes |

A ~51 MB site is hiding inside a 63 MB payload. Fixing §5.1 and §5.2 brings it to roughly **23 MB**
with no functional loss.

---

## 7. Deployment

### Constraint hit first
The sandbox cannot reach `api.vercel.com` or `vercel.com` (TCP blocked, `000`), so the Vercel CLI
path was unavailable; all Vercel work went through the connector. Two GitHub attempts also failed:

- `gh repo create` → `403 Resource not accessible by integration` (token is app-scoped, no repo-create)
- `POST /repos/…/forks` → same 403
- `create_project` with `git_repository` → `400 You need admin or write access to the repository to link it`

### What worked
`create_deployment` with a bare `git_source` needs **no repo write access** — it clones a public repo
and builds it. That is the deploy path used:

```json
{
  "name": "aimees-papercraft-world",
  "git_source": { "type": "github", "repoId": "1123930922", "ref": "main" },
  "project_settings": "{\"framework\":\"vite\",\"buildCommand\":\"vite build\",\"outputDirectory\":\"dist\"}",
  "target": "production"
}
```

Build log: cloned in 3.56 s → `npm install` → `vite build` (630 modules) → **READY in 22.5 s**;
build cache saved (58 MB, 11,036 files). Aliases assigned and promoted:

- https://aimees-papercraft-world-sooty.vercel.app
- https://aimees-papercraft-world-argamerzz9582-debugs-projects.vercel.app
- https://aimees-papercraft-world-git-main-argamerzz9582-debugs-projects.vercel.app

Verified: fetching the live URL returns the same markup and title as the original site.

### Consequence to be aware of
Because the project is bound to `andrewwoan/aimee-xus-papercraft-world` and I could not create my own
repo, **this deployment tracks upstream `main`** — a push there would change this site, and the fixes
in §5 cannot be applied through this project. To own the code, add the repo to the Vercel GitHub App
(needs `Administration`/repo-create scope on the GitHub connection) and redeploy from your own copy.

### Local preview
A `vite preview` server runs in this session on **port 3000** (live preview in the UI). Vite's dev
host allowlist rejects proxied preview hosts by default, so `vite.config.js` in the scratch clone was
given:

```js
preview: { allowedHosts: true }
```

That edit exists only in `/tmp/papercraft-src` and is **not** part of the deployed build.

Asset serving verified on the preview with correct MIME types: `/` → `text/html`, `.wasm` →
`application/wasm`, `.glb` → `model/gltf-binary`, `.ktx2` → `image/ktx2`, `.webp` → `image/webp`,
`.webmanifest` → `application/manifest+json`.

---

## 8. Priority fixes

1. **Delete `public/media/favicon.svg`** or re-export it (~28 MB → a few KB). Biggest single win.
2. **Delete `public/images/` + `public/basis/`**, simplify `ktxLoader.jsx` (~12.6 MB, dead code).
3. **Fix `site.webmanifest` icon paths** (`/media/…`) and the `MyWebSite` placeholder name.
4. **Code-split the 2 MB bundle** per scene or split `three` into its own chunk.
5. **Replace `/vite.svg`** with a project icon.

---

## Appendix — evidence

- `data/assets.csv` — per-file size, magic-byte header, detected format
- Source clone: `/tmp/papercraft-src` (build output in `dist/`)
- Analysis tool: `decompile` 0.0.1 (`analyze`, plus radare2 6.2.6 for container triage)
