/**
 * Browser build of `recurram` backend bootstrap: WASM only, no N-API preloading /
 * bundled `.node` assets (see recurram-js `dist/backend.js`).
 */
import type { InitOptions } from '../../../recurram-js/dist/types.js';
import type { RuntimeBackend, RuntimeKind } from '../../../recurram-js/dist/runtime/types.js';

import { loadNodeBackend } from './recurram-node-backend.js';
import { loadWasmBackend } from './recurram-wasm-backend.js';

let backend: RuntimeBackend | null = null;
let initPromise: Promise<RuntimeBackend> | null = null;

export async function initBackend(options: InitOptions = {}): Promise<RuntimeKind> {
  if (backend) {
    return backend.kind;
  }
  if (!initPromise) {
    initPromise = loadBackend(options).catch((error: unknown) => {
      initPromise = null;
      throw error;
    });
  }
  backend = await initPromise;
  return backend.kind;
}

export function requireBackend(): RuntimeBackend {
  if (backend) {
    return backend;
  }

  throw new Error(
    'recurram is not initialized. Call await init() before encode/decode in browser runtimes.',
  );
}

async function loadBackend(options: InitOptions): Promise<RuntimeBackend> {
  const prefer = options.prefer;
  if (prefer === 'napi') {
    if (!isNodeRuntime()) {
      throw new Error('N-API backend is only available in Node.js');
    }
    return loadNodeBackend();
  }
  if (prefer === 'wasm') {
    if (isNodeRuntime()) {
      throw new Error('WASM backend is intended for browser JS. Use prefer: "napi" on Node.js');
    }
    return loadWasmBackend(options.wasmInput);
  }

  if (isNodeRuntime()) {
    return loadNodeBackend();
  }
  return loadWasmBackend(options.wasmInput);
}

function isNodeRuntime(): boolean {
  const proc = (
    globalThis as {
      process?: { versions?: { node?: unknown } };
    }
  ).process;
  return typeof proc?.versions?.node === 'string';
}
