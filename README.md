# Twilic Playground

**Suggested GitHub repository description:** Playground for testing Twilic encoding and visualizing size savings.

Browser playground built with **Vite**, **React**, and [**Cloudflare Kumo**](https://kumo-ui.com/). Two views:

1. **Encoded sizes** — same fixture payloads and serialization rules as [benchmark](https://github.com/twilic/benchmark); compares **Twilic**, **MessagePack**, **CBOR**, **BSON**, and **JSON (UTF-8)**.
2. **Schema-first** — compares Twilic Bound profile (`encodeWithSchema`) with **Protobuf**, **Avro**, **FlatBuffers**, and **Apache Arrow IPC** (plus schema-less Twilic) on [schema-example.json](https://github.com/twilic/twilic/blob/main/examples/schema-example.json) style records.

BSON batches use the same `{ records: [...] }` shape; “vs …” columns use the bench formula \((1 - \text{twilic}/\text{baseline}) \times 100\).

This project always depends on a **local sibling** [`twilic-js`](https://github.com/twilic/twilic-js) checkout via `file:../twilic-js` (not the published npm package), so the playground tracks your latest TypeScript and WASM build.

## Features

- **Bench fixtures** — `single-small`, homogeneous and mixed **batch-256**, and **patch-session** payloads aligned with `benchmark`.
- **Custom JSON** — paste or edit a root object `{…}` or array `[…]`; a highlighted row is added above the fixtures when the payload is valid.
- **Size table** — byte counts per format plus percent smaller than Twilic vs MessagePack, CBOR, BSON, and JSON.
- **Schema-first table** — `UserRecordV1` fixtures (×1, ×3 from schema-example, ×256 homogeneous); Twilic bound/dynamic; per-codec **stream** (concatenated messages) and **pack** (Protobuf repeated, Avro OCF, FlatBuffers vector, Arrow IPC).
- **WASM runtime** — encoding runs in the browser via `@twilic/core/advanced` with `init({ prefer: 'wasm' })`; Node N-API is not bundled.

## Stack

| Layer             | Choice                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| UI                | [@cloudflare/kumo](https://kumo-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)                 |
| App               | React 19, TypeScript, Vite 8 (Rolldown)                                                                |
| Encoding          | Local `twilic-js` (WASM)                                                                               |
| Comparison codecs | `@msgpack/msgpack`, `cbor-x`, `bson`; schema page: `protobufjs`, `avsc`, `flatbuffers`, `apache-arrow` |

## Prerequisites

- Node.js **≥ 24**
- [pnpm](https://pnpm.io/) **10.18.1** (see `packageManager` in `package.json`)
- Cloned next to `twilic-js`:

```text
your-workspace/
  twilic-js/     # https://github.com/twilic/twilic-js
  twilic-rust/   # required when building twilic-js (bridge path dependency)
  playground/      # this repo
```

Build WASM and TypeScript in `twilic-js` before running the playground:

```bash
cd ../twilic-js
pnpm install
pnpm build:wasm
pnpm build:ts
```

For a full `twilic-js` setup from a clean tree, follow that repository’s README (Rust, `wasm-pack`).

## Commands

```bash
cd playground
pnpm install
pnpm sync-wasm     # mirrors ../twilic-js/wasm/pkg → wasm/pkg (also runs before dev/build)
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

The workflow (`.github/workflows/github-pages.yml`) checks out this repo, clones [`twilic/twilic-js`](https://github.com/twilic/twilic-js) and [`twilic/twilic-rust`](https://github.com/twilic/twilic-rust) beside the workspace (same layout as twilic-js CI), builds **WASM + TypeScript** there, then installs and builds this app. Deployed Pages therefore track the latest **`twilic-js` default branch**, not the npm registry.

## Bench alignment and limitations

- **Encoded sizes** on the page are directly comparable to benchmark’s “encoded size comparison” rows (payload names match).
- **Throughput** (ops/s) is not shown; the benchmark suite runs in Node with **N-API** by default, while the playground uses **WASM** only, so browser timings would not match bench numbers even if measured.

## Implementation notes

- `scripts/sync-twilic-wasm.mjs` (via **`pnpm sync-wasm`**, **`predev`**, **`prebuild`**, and a matching Vite **`buildStart`** hook) copies `../twilic-js/wasm/pkg` into **`wasm/pkg/`** (gitignored) so wasm imports resolve inside this workspace.
- **`vite.config.ts`** sets **`assetsInclude`** for `*.wasm` so Rolldown can bundle wasm-pack’s `import '*.wasm'`. Without bundling, serving raw bindings from `/public` often breaks under **`pnpm preview`** (MIME / module errors in Chromium).
- **`build.rolldownOptions.output.codeSplitting`** splits vendor chunks (React, Kumo, codecs) to keep the main bundle under Vite’s size warning threshold.
- **`src/shims/`** substitutes browser-safe backends so the client bundle excludes Node-only N-API loaders and `.node` binaries.
- WASM loads via `twilic_wasm_bg.wasm?url` + manual `instantiateStreaming` with `{ './twilic_wasm_bg.js': glue }` (not `twilic_wasm.js` or bare `?init`): Rolldown/`?init` omit wasm-bindgen JS imports and break initialization.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
