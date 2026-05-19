import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const playgroundDir = path.dirname(fileURLToPath(import.meta.url));
const twilicJsRoot = path.resolve(playgroundDir, '..', 'twilic-js');
const wasmPkgSource = path.join(twilicJsRoot, 'wasm', 'pkg');

/**
 * Copies built wasm-bindgen output **into this repo** so Vite/Rolldown can resolve
 * `import '*.wasm'` (sibling-package paths under `../twilic-js` fail during build).
 * Not committed (see `.gitignore`). Still uses your local twilic-js build output.
 */
function syncTwilicWasmIntoWorkspace(): Plugin {
  const wasmPkgDest = path.join(playgroundDir, 'wasm', 'pkg');

  return {
    name: 'sync-twilic-wasm-workspace-copy',
    buildStart() {
      if (!fs.existsSync(wasmPkgSource)) {
        throw new Error(
          `[playground] Missing ${wasmPkgSource}. Run pnpm build:wasm in twilic-js (see README).`,
        );
      }
      fs.mkdirSync(wasmPkgDest, { recursive: true });
      fs.cpSync(wasmPkgSource, wasmPkgDest, { recursive: true });
    },
  };
}

/** GitHub Pages project sites are served from /<repository-name>/ */
function pagesBase(): string {
  if (process.env.GITHUB_PAGES === 'true') {
    const repo = process.env.GITHUB_REPOSITORY ?? '';
    const name = repo.includes('/') ? repo.split('/')[1] : '';
    if (name) {
      return `/${name}/`;
    }
  }
  return '/';
}

function isTwilicCorePath(filePath: string | undefined): boolean {
  if (!filePath) {
    return false;
  }
  const norm = filePath.replaceAll('\\', '/');
  return norm.includes('/@twilic/core/') || norm.includes('/twilic-js/');
}

/** Force browser shims so we do not bundle Node-only N-API loaders or `.node` binaries. */
function twilicBackendAliases(): Plugin {
  const stubNode = path.join(playgroundDir, 'src', 'shims', 'twilic-node-backend.ts');
  const stubWasm = path.join(playgroundDir, 'src', 'shims', 'twilic-wasm-backend.ts');

  return {
    name: 'twilic-backend-aliases',
    enforce: 'pre',
    resolveId(source, importer) {
      const fromTwilic = isTwilicCorePath(importer);
      if (!fromTwilic && !isTwilicCorePath(source)) {
        return null;
      }

      if (source === './backend.js') {
        const norm = importer?.replaceAll('\\', '/') ?? '';
        if (
          isTwilicCorePath(norm) &&
          norm.includes('/dist/') &&
          /[/](index|advanced)\.js$/.test(norm)
        ) {
          return path.join(playgroundDir, 'src', 'shims', 'twilic-backend.ts');
        }
      }

      if (
        source === './runtime/node-backend.js' ||
        source.endsWith(`${path.sep}runtime${path.sep}node-backend.js`) ||
        source.endsWith('/runtime/node-backend.js')
      ) {
        return stubNode;
      }

      if (
        source === './runtime/wasm-backend.js' ||
        source.endsWith(`${path.sep}runtime${path.sep}wasm-backend.js`) ||
        source.endsWith('/runtime/wasm-backend.js')
      ) {
        return stubWasm;
      }

      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  /** Wasm-pack `--target bundler`; required for Rolldown to load sibling `*.wasm` imports. */
  assetsInclude: ['**/*.wasm'],
  plugins: [syncTwilicWasmIntoWorkspace(), twilicBackendAliases(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@twilic/wasm-glue': path.join(playgroundDir, 'wasm', 'pkg', 'twilic_wasm_bg.js'),
      // Bundle `util` instead of Rolldown's empty browser external (avsc needs debuglog/format).
      util: path.join(playgroundDir, 'src', 'shims', 'node-util.ts'),
      avsc: path.join(playgroundDir, 'node_modules/avsc/etc/browser/avsc-types.js'),
    },
  },
  base: pagesBase(),
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules\/(react-dom|react)\// },
            { name: 'vendor-kumo', test: /node_modules\/@cloudflare\/kumo\// },
            { name: 'vendor-icons', test: /node_modules\/@phosphor-icons\// },
            {
              name: 'vendor-codecs',
              test: /node_modules\/(@msgpack|cbor-x|bson|protobufjs|avsc|flatbuffers|apache-arrow|@twilic\/core)\//,
            },
          ],
        },
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
