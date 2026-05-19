import type {
  RuntimeBackend,
  RuntimeSessionEncoder,
  TransportValueObj,
} from '../../../twilic-js/dist/runtime/types.js';

import wasmUrl from '../../wasm/pkg/twilic_wasm_bg.wasm?url';
import * as wasmGlue from '@twilic/wasm-glue';
import {
  __wbg_set_wasm,
  createSessionEncoder as wasmCreateSessionEncoder,
  decodeToTransportJson,
  encodeBatchTransportJson,
  encodeTransportJson,
  encodeWithSchemaTransportJson,
  type SessionEncoder as WasmSessionEncoder,
} from '@twilic/wasm-glue';

/** Module name baked into the wasm-bindgen artifact (see twilic_wasm_bg.wasm imports). */
const WASM_GLUE_MODULE = './twilic_wasm_bg.js';

/**
 * WASM entry is duplicated under `playground/wasm/pkg` by Vite (see `vite.config.ts`) so
 * `import '*.wasm'` is resolved inside this project—required for Rolldown; **do not** load that
 * tree raw from `/public` (MIME / module graph breaks under `pnpm preview`).
 *
 * Do not use `twilic_wasm.js` (Rolldown passes a URL to `__wbg_set_wasm`) or bare `?init`
 * (Vite omits wasm-bindgen JS imports). Instantiate with the glue namespace, then
 * `__wbg_set_wasm(exports)`.
 */
export async function loadWasmBackend(wasmInput?: unknown): Promise<RuntimeBackend> {
  void wasmInput;
  const exports = await instantiateTwilicWasm();
  __wbg_set_wasm(exports);

  return {
    kind: 'wasm',
    encodeTransportJson: (valueJson) => encodeTransportJson(valueJson),
    decodeToTransportJson: (bytes) => decodeToTransportJson(bytes),
    decodeToCompactJson: (bytes) => decodeToTransportJson(bytes),
    encodeWithSchemaTransportJson: (schemaJson, valueJson) =>
      encodeWithSchemaTransportJson(schemaJson, valueJson),
    encodeBatchTransportJson: (valuesJson) => encodeBatchTransportJson(valuesJson),
    encodeDirect: (value) => encodeTransportJson(JSON.stringify(value)),
    decodeDirect: (bytes) => JSON.parse(decodeToTransportJson(bytes)) as TransportValueObj,
    encodeBatchDirect: (values) => encodeBatchTransportJson(JSON.stringify(values)),
    encodeCompactJson: (json) => encodeTransportJson(json),
    encodeBatchCompactJson: (json) => encodeBatchTransportJson(json),
    createSessionEncoder: (optionsJson) => {
      const inner = wasmCreateSessionEncoder(optionsJson);
      return wrapSessionEncoder(inner);
    },
  };
}

function buildGlueImports(): WebAssembly.ModuleImports {
  // wasm-bindgen imports (see twilic_wasm_bg.wasm). Read each export from the glue
  // namespace so Rolldown getter wrappers are unwrapped before passing to WASM.
  return {
    __wbindgen_object_drop_ref: wasmGlue.__wbindgen_object_drop_ref,
    __wbg_getRandomValues_3f44b700395062e5: wasmGlue.__wbg_getRandomValues_3f44b700395062e5,
    __wbg___wbindgen_throw_6b64449b9b9ed33c: wasmGlue.__wbg___wbindgen_throw_6b64449b9b9ed33c,
    __wbindgen_cast_0000000000000001: wasmGlue.__wbindgen_cast_0000000000000001,
  };
}

async function instantiateTwilicWasm(): Promise<WebAssembly.Exports> {
  const imports: WebAssembly.Imports = {
    [WASM_GLUE_MODULE]: buildGlueImports(),
  };

  const response = await fetch(wasmUrl);
  const contentType = response.headers.get('Content-Type') ?? '';

  if (
    typeof WebAssembly.instantiateStreaming === 'function' &&
    contentType.startsWith('application/wasm')
  ) {
    const { instance } = await WebAssembly.instantiateStreaming(response, imports);
    return instance.exports;
  }

  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  return instance.exports;
}

function wrapSessionEncoder(inner: WasmSessionEncoder): RuntimeSessionEncoder {
  return {
    encodeTransportJson: (valueJson) => inner.encodeTransportJson(valueJson),
    encodeWithSchemaTransportJson: (schemaJson, valueJson) =>
      inner.encodeWithSchemaTransportJson(schemaJson, valueJson),
    encodeBatchTransportJson: (valuesJson) => inner.encodeBatchTransportJson(valuesJson),
    encodePatchTransportJson: (valueJson) => inner.encodePatchTransportJson(valueJson),
    encodeMicroBatchTransportJson: (valuesJson) => inner.encodeMicroBatchTransportJson(valuesJson),
    encodeDirect: (value) => inner.encodeTransportJson(JSON.stringify(value)),
    encodeBatchDirect: (values) => inner.encodeBatchTransportJson(JSON.stringify(values)),
    encodePatchDirect: (value) => inner.encodePatchTransportJson(JSON.stringify(value)),
    encodeMicroBatchDirect: (values) => inner.encodeMicroBatchTransportJson(JSON.stringify(values)),
    encodeCompactJson: (json) => inner.encodeTransportJson(json),
    encodeBatchCompactJson: (json) => inner.encodeBatchTransportJson(json),
    encodePatchCompactJson: (json) => inner.encodePatchTransportJson(json),
    encodeMicroBatchCompactJson: (json) => inner.encodeMicroBatchTransportJson(json),
    reset: () => inner.reset(),
  };
}
