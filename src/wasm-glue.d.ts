declare module '@twilic/wasm-glue' {
  export function __wbindgen_object_drop_ref(arg0: number): void;
  export function __wbg_getRandomValues_3f44b700395062e5(arg0: number, arg1: number): void;
  export function __wbg___wbindgen_throw_6b64449b9b9ed33c(arg0: number, arg1: number): void;
  export function __wbindgen_cast_0000000000000001(arg0: number, arg1: number): unknown;

  export class SessionEncoder {
    free(): void;
    encodeBatchTransportJson(values_json: string): Uint8Array;
    encodeMicroBatchTransportJson(values_json: string): Uint8Array;
    encodePatchTransportJson(value_json: string): Uint8Array;
    encodeTransportJson(value_json: string): Uint8Array;
    encodeWithSchemaTransportJson(schema_json: string, value_json: string): Uint8Array;
    reset(): void;
  }

  export function __wbg_set_wasm(val: WebAssembly.Exports): void;
  export function createSessionEncoder(options_json?: string | null): SessionEncoder;
  export function decodeToTransportJson(bytes: Uint8Array): string;
  export function encodeBatchTransportJson(values_json: string): Uint8Array;
  export function encodeTransportJson(value_json: string): Uint8Array;
  export function encodeWithSchemaTransportJson(
    schema_json: string,
    value_json: string,
  ): Uint8Array;
}
