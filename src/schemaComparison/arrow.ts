import { RecordBatchStreamWriter, tableFromJSON } from 'apache-arrow';

import type { SchemaUserRecord } from './records.js';
import { concatUint8Arrays } from './bytes.js';

export interface ArrowCodec {
  /** Arrow IPC stream (schema + record batches in one stream). */
  encodeIpc(records: SchemaUserRecord[]): Promise<Uint8Array>;
}

export function createArrowCodec(): ArrowCodec {
  return {
    async encodeIpc(records) {
      const table = tableFromJSON(records as unknown as Record<string, unknown>[]);
      const writer = RecordBatchStreamWriter.writeAll(table);
      const chunks: Uint8Array[] = [];
      for await (const chunk of writer) {
        chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      }
      return concatUint8Arrays(chunks);
    },
  };
}
