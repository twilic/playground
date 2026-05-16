# Recurram playground

**Suggested GitHub repository description:** Playground for testing Recurram encoding and visualizing size savings.

Browser playground built with **Vite**, **React**, and [**Cloudflare Kumo**](https://kumo-ui.com/). It loads the **same fixture payloads and serialization rules** as [recurram-bench](https://github.com/recurram/recurram-bench) and compares encoded sizes for **Recurram**, **MessagePack**, **CBOR**, **BSON**, and **JSON (UTF-8)**. BSON batches use the same `{ records: [...] }` shape; “vs …” columns use the bench formula \((1 - \text{recurram}/\text{baseline}) \times 100\).

This project always depends on a **local sibling** [`recurram-js`](https://github.com/recurram/recurram-js) checkout via `file:../recurram-js` (not the published npm package), so the playground tracks your latest TypeScript and WASM build.

## Features

- **Bench fixtures** — `single-small`, homogeneous and mixed **batch-256**, and **patch-session** payloads aligned with `recurram-bench`.
- **Custom JSON** — paste or edit a root object `{…}` or array `[…]`; a highlighted row is added above the fixtures when the payload is valid.
- **Size table** — byte counts per format plus percent smaller than Recurram vs MessagePack, CBOR, BSON, and JSON.
- **WASM runtime** — encoding runs in the browser via `recurram/advanced` with `init({ prefer: 'wasm' })`; Node N-API is not bundled.

## Stack

| Layer             | Choice                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| UI                | [@cloudflare/kumo](https://kumo-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| App               | React 19, TypeScript, Vite 8 (Rolldown)                                                |
| Encoding          | Local `recurram-js` (WASM)                                                             |
| Comparison codecs | `@msgpack/msgpack`, `cbor-x`, `bson`                                                   |

## Prerequisites

- Node.js **≥ 24**
- [pnpm](https://pnpm.io/) **10.18.1** (see `packageManager` in `package.json`)
- Cloned next to `recurram-js`:

```text
your-workspace/
  recurram-js/     # https://github.com/recurram/recurram-js
  recurram-rust/   # required when building recurram-js (bridge path dependency)
  playground/      # this repo
```

Build WASM and TypeScript in `recurram-js` before running the playground:

```bash
cd ../recurram-js
pnpm install
pnpm build:wasm
pnpm build:ts
```

For a full `recurram-js` setup from a clean tree, follow that repository’s README (Rust, `wasm-pack`).

## Commands

```bash
cd playground
pnpm install
pnpm sync-wasm     # mirrors ../recurram-js/wasm/pkg → wasm/pkg (also runs before dev/build)
pnpm dev           # http://localhost:5173
pnpm build         # production build (bundled WASM in dist/assets/)
pnpm preview       # preview the production build locally
pnpm lint          # ESLint
pnpm format        # Prettier
```

### GitHub Pages (`base` URL)

Project sites are served from `https://<user>.github.io/<repo>/`. Vite’s `base` is set when **`GITHUB_PAGES=true`** at build time (see `vite.config.ts`). Production JS and WASM chunks use hashed names under `dist/assets/` and honor that base path.

## GitHub Pages deployment

1. In the repository **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push to `main`, or run **Actions → Deploy GitHub Pages** manually.

The workflow (`.github/workflows/github-pages.yml`) checks out this repo, clones [`recurram/recurram-js`](https://github.com/recurram/recurram-js) and [`recurram/recurram-rust`](https://github.com/recurram/recurram-rust) beside the workspace (same layout as recurram-js CI), builds **WASM + TypeScript** there, then installs and builds this app. Deployed Pages therefore track the latest **`recurram-js` default branch**, not the npm registry.

## Bench alignment and limitations

- **Encoded sizes** on the page are directly comparable to recurram-bench’s “encoded size comparison” rows (payload names match).
- **Throughput** (ops/s) is not shown; the benchmark suite runs in Node with **N-API** by default, while the playground uses **WASM** only, so browser timings would not match bench numbers even if measured.

## Implementation notes

- `scripts/sync-recurram-wasm.mjs` (via **`pnpm sync-wasm`**, **`predev`**, **`prebuild`**, and a matching Vite **`buildStart`** hook) copies `../recurram-js/wasm/pkg` into **`wasm/pkg/`** (gitignored) so wasm imports resolve inside this workspace.
- **`vite.config.ts`** sets **`assetsInclude`** for `*.wasm` so Rolldown can bundle wasm-pack’s `import '*.wasm'`. Without bundling, serving raw bindings from `/public` often breaks under **`pnpm preview`** (MIME / module errors in Chromium).
- **`build.rolldownOptions.output.codeSplitting`** splits vendor chunks (React, Kumo, codecs) to keep the main bundle under Vite’s size warning threshold.
- **`src/shims/`** substitutes browser-safe backends so the client bundle excludes Node-only N-API loaders and `.node` binaries.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
