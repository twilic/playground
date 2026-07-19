import {
  encode,
  encodeBatch,
  encodeBatchWithSchema,
  encodeBoundStream,
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
  twilicBoundStream: number;
  twilicSchemaBatch: number;
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

/** v3 BOUND_STREAM (0x0F): schema-bound compact record stream. */
export function measureTwilicBoundStream(schema: Schema, records: TwilicValue[]): number {
  return encodeBoundStream(schema, records).byteLength;
}

/** v3 SCHEMA_BATCH (0x0E): schema-aware columnar batch. */
export function measureTwilicSchemaBatch(schema: Schema, records: TwilicValue[]): number {
  return encodeBatchWithSchema(schema, records).byteLength;
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

  const twilicBoundStream = measureTwilicBoundStream(schema, scenario.records);
  const twilicSchemaBatch = measureTwilicSchemaBatch(schema, scenario.records);
  const twilicDynamic = measureTwilicDynamic(scenario.records);

  const baselines = { protobuf, avro, flatbuffers, arrowIpc };
  return {
    payload: scenario.label,
    twilicBoundStream,
    twilicSchemaBatch,
    twilicDynamic,
    protobuf,
    avro,
    flatbuffers,
    arrowIpc,
    vsBestStreamPct: pctSmallerVersus(twilicBoundStream, bestStreamBaseline(baselines)),
    vsBestPackPct: pctSmallerVersus(twilicSchemaBatch, bestPackBaseline(baselines)),
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
