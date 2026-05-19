import {
  createSessionEncoder,
  encode,
  encodeBatch,
  type Schema,
  type TwilicValue,
} from '@twilic/core/advanced';

import type { SchemaBenchScenario } from './fixtures.js';
import { userRecordSchema } from './fixtures.js';
import { toSchemaRecords } from './records.js';
import { createSchemaCodecs, type SchemaCodecBundle } from './schemaCodecs.js';

export interface SchemaCodecSizes {
  stream: number;
  pack: number;
}

export interface SchemaSizeComparisonRow {
  payload: string;
  twilicBound: number;
  twilicDynamic: number;
  protobuf: SchemaCodecSizes;
  avro: SchemaCodecSizes;
  flatbuffers: SchemaCodecSizes;
  arrowIpc: number;
  vsBestStreamPct: number;
  vsBestPackPct: number;
}

function pctSmallerVersus(smaller: number, larger: number): number {
  if (smaller <= 0 || larger <= 0) {
    return NaN;
  }
  return (1 - smaller / larger) * 100;
}

function concatEncoded(chunks: Uint8Array[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
}

/** Session stream: schema_id on first message only (Bound profile). */
export function measureTwilicBoundStream(schema: Schema, records: TwilicValue[]): number {
  const session = createSessionEncoder();
  const chunks = records.map((record) => session.encodeWithSchema(schema, record));
  return concatEncoded(chunks);
}

export function measureTwilicDynamic(records: TwilicValue[]): number {
  if (records.length === 1) {
    return encode(records[0]).byteLength;
  }
  return encodeBatch(records).byteLength;
}

function bestStreamBaseline(row: {
  protobuf: SchemaCodecSizes;
  avro: SchemaCodecSizes;
  flatbuffers: SchemaCodecSizes;
}): number {
  return Math.min(row.protobuf.stream, row.avro.stream, row.flatbuffers.stream);
}

function bestPackBaseline(row: {
  protobuf: SchemaCodecSizes;
  avro: SchemaCodecSizes;
  flatbuffers: SchemaCodecSizes;
  arrowIpc: number;
}): number {
  return Math.min(row.protobuf.pack, row.avro.pack, row.flatbuffers.pack, row.arrowIpc);
}

export async function measureSchemaScenario(
  scenario: SchemaBenchScenario,
  schema: Schema,
  codecs: SchemaCodecBundle,
): Promise<SchemaSizeComparisonRow> {
  const records = toSchemaRecords(scenario.records);

  const protobuf: SchemaCodecSizes = {
    stream: codecs.protobuf.encodeStream(records).byteLength,
    pack: codecs.protobuf.encodeRepeated(records).byteLength,
  };
  const avro: SchemaCodecSizes = {
    stream: codecs.avro.encodeStream(records).byteLength,
    pack: codecs.avro.encodeOcf(records).byteLength,
  };
  const flatbuffers: SchemaCodecSizes = {
    stream: codecs.flatbuffers.encodeStream(records).byteLength,
    pack: codecs.flatbuffers.encodePack(records).byteLength,
  };
  const arrowIpc = (await codecs.arrow.encodeIpc(records)).byteLength; // async IPC writer

  const twilicBound = measureTwilicBoundStream(schema, scenario.records);
  const twilicDynamic = measureTwilicDynamic(scenario.records);

  const baselines = { protobuf, avro, flatbuffers, arrowIpc };
  return {
    payload: scenario.label,
    twilicBound,
    twilicDynamic,
    protobuf,
    avro,
    flatbuffers,
    arrowIpc,
    vsBestStreamPct: pctSmallerVersus(twilicBound, bestStreamBaseline(baselines)),
    vsBestPackPct: pctSmallerVersus(twilicBound, bestPackBaseline(baselines)),
  };
}

export async function measureAllSchemaScenarios(
  scenarios: SchemaBenchScenario[],
): Promise<SchemaSizeComparisonRow[]> {
  const codecs = createSchemaCodecs();
  const rows: SchemaSizeComparisonRow[] = [];
  for (const scenario of scenarios) {
    rows.push(await measureSchemaScenario(scenario, userRecordSchema, codecs));
  }
  return rows;
}
