import avro from 'avsc';
import type { Type } from 'avsc';

import type { SchemaUserRecord } from './records.js';
import { concatUint8Arrays } from './bytes.js';

const AVRO_FILE_OPTS = { namespace: 'org.apache.avro.file' } as const;

const MAP_BYTES_TYPE = avro.Type.forSchema({ type: 'map', values: 'bytes' }, AVRO_FILE_OPTS);

const HEADER_TYPE = avro.Type.forSchema(
  {
    name: 'Header',
    type: 'record',
    fields: [
      { name: 'magic', type: { type: 'fixed', name: 'Magic', size: 4 } },
      { name: 'meta', type: MAP_BYTES_TYPE },
      { name: 'sync', type: { type: 'fixed', name: 'HeaderSync', size: 16 } },
    ],
  },
  AVRO_FILE_OPTS,
);

const BLOCK_TYPE = avro.Type.forSchema(
  {
    name: 'Block',
    type: 'record',
    fields: [
      { name: 'count', type: 'long' },
      { name: 'data', type: 'bytes' },
      { name: 'sync', type: { type: 'fixed', name: 'BlockSync', size: 16 } },
    ],
  },
  AVRO_FILE_OPTS,
);

const USER_RECORD_AVRO_SCHEMA = {
  type: 'record',
  name: 'UserRecordV1',
  namespace: 'twilic.playground',
  fields: [
    { name: 'id', type: 'int' },
    { name: 'role', type: 'string' },
    { name: 'age', type: ['null', 'int'], default: null },
    { name: 'active', type: 'boolean' },
  ],
};

export interface AvroCodec {
  encodeStream(records: SchemaUserRecord[]): Uint8Array;
  /** Avro object container file (schema in header, one data block). */
  encodeOcf(records: SchemaUserRecord[]): Uint8Array;
}

function toAvroValue(record: SchemaUserRecord): Record<string, unknown> {
  return {
    id: record.id,
    role: record.role,
    age: record.age ?? null,
    active: record.active,
  };
}

function toUint8Array(chunk: Buffer | Uint8Array): Uint8Array {
  return chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
}

function encodeOcfSync(type: Type, records: SchemaUserRecord[]): Uint8Array {
  const sync = crypto.getRandomValues(new Uint8Array(16));
  const syncBuf = Buffer.from(sync);

  const schemaJson = JSON.stringify(type.schema({ exportAttrs: true }));
  const header = HEADER_TYPE.toBuffer({
    magic: Buffer.from('Obj\x01'),
    meta: {
      'avro.schema': Buffer.from(schemaJson, 'utf8'),
      'avro.codec': Buffer.from('null', 'utf8'),
    },
    sync: syncBuf,
  });

  const blockData = concatUint8Arrays(
    records.map((record) => toUint8Array(type.toBuffer(toAvroValue(record)))),
  );

  const block = BLOCK_TYPE.toBuffer({
    count: records.length,
    data: Buffer.from(blockData),
    sync: syncBuf,
  });

  const footer = BLOCK_TYPE.toBuffer({
    count: 0,
    data: Buffer.alloc(0),
    sync: syncBuf,
  });

  return concatUint8Arrays([toUint8Array(header), toUint8Array(block), toUint8Array(footer)]);
}

export function createAvroCodec(): AvroCodec {
  const type: Type = avro.Type.forSchema(
    USER_RECORD_AVRO_SCHEMA as Parameters<typeof avro.Type.forSchema>[0],
  );

  return {
    encodeStream(records) {
      const chunks = records.map((record) => toUint8Array(type.toBuffer(toAvroValue(record))));
      return concatUint8Arrays(chunks);
    },
    encodeOcf(records) {
      return encodeOcfSync(type, records);
    },
  };
}
