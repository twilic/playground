import { Builder } from 'flatbuffers';

import type { SchemaUserRecord } from './records.js';
import { concatUint8Arrays } from './bytes.js';

export interface FlatBuffersCodec {
  /** Size-prefixed root tables concatenated (stream). */
  encodeStream(records: SchemaUserRecord[]): Uint8Array;
  /** Single root table with a vector of records (pack). */
  encodePack(records: SchemaUserRecord[]): Uint8Array;
}

function buildUserRecord(builder: Builder, record: SchemaUserRecord): number {
  const roleOffset = builder.createString(record.role);
  builder.startObject(4);
  builder.addFieldInt32(0, record.id, 0);
  builder.addFieldOffset(1, roleOffset, 0);
  if (record.age !== undefined) {
    builder.addFieldInt8(2, record.age, 0);
  }
  builder.addFieldInt8(3, record.active ? 1 : 0, 0);
  return builder.endObject();
}

export function createFlatBuffersCodec(): FlatBuffersCodec {
  return {
    encodeStream(records) {
      const chunks = records.map((record) => {
        const builder = new Builder(128);
        const root = buildUserRecord(builder, record);
        builder.finishSizePrefixed(root);
        return builder.asUint8Array();
      });
      return concatUint8Arrays(chunks);
    },
    encodePack(records) {
      const builder = new Builder(Math.max(256, records.length * 64));
      const offsets = records.map((record) => buildUserRecord(builder, record));
      builder.startVector(4, offsets.length, 4);
      for (let index = offsets.length - 1; index >= 0; index -= 1) {
        builder.addOffset(offsets[index]);
      }
      const vectorOffset = builder.endVector();
      builder.startObject(1);
      builder.addFieldOffset(0, vectorOffset, 0);
      const root = builder.endObject();
      builder.finish(root);
      return builder.asUint8Array();
    },
  };
}
