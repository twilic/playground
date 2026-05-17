import { decode as decodeMsgpack, encode as encodeMsgpack } from '@msgpack/msgpack';
import { deserialize as deserializeBson, serialize as serializeBson } from 'bson';
import { decode as decodeCbor, encode as encodeCbor } from 'cbor-x';
import { decode, encode, encodeBatch, type TwilicValue } from 'twilic/advanced';

import type { BenchDataset } from './benchmarkPayloads.js';

export interface SizeComparisonRow {
  payload: string;
  twilic: number;
  msgpack: number;
  cbor: number;
  bson: number;
  json: number;
  vsMsgpackPct: number;
  vsCborPct: number;
  vsBsonPct: number;
  vsJsonPct: number;
}

/** JSON.stringify cannot encode BigInt; fixtures may round-trip as bigint (e.g. WASM decode). */
function jsonStringifyWithBigInt(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val));
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(jsonStringifyWithBigInt(value)).byteLength;
}

/** Normalize for equality checks (decode may return bigint for numeric fields). */
function normalizeBenchValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const n = Number(value);
    if (!Number.isSafeInteger(n)) {
      return value.toString();
    }
    return n;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeBenchValue);
  }
  if (value instanceof Uint8Array) {
    return value;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    out[k] = normalizeBenchValue(obj[k]);
  }
  return out;
}

function twilicRoundTripLooksEqual(original: unknown, decoded: unknown): boolean {
  return (
    JSON.stringify(normalizeBenchValue(original)) === JSON.stringify(normalizeBenchValue(decoded))
  );
}

function pctSmallerVersus(smaller: number, larger: number): number {
  if (smaller <= 0 || larger <= 0) {
    return NaN;
  }
  return (1 - smaller / larger) * 100;
}

function toSizeComparisonRow(
  payload: string,
  twilic: number,
  msgpack: Uint8Array,
  cbor: Uint8Array,
  bson: Uint8Array,
  jsonSize: number,
): SizeComparisonRow {
  const rr = twilic;
  const m = msgpack.byteLength;
  const c = cbor.byteLength;
  const b = bson.byteLength;
  const j = jsonSize;
  return {
    payload,
    twilic: rr,
    msgpack: m,
    cbor: c,
    bson: b,
    json: j,
    vsMsgpackPct: pctSmallerVersus(rr, m),
    vsCborPct: pctSmallerVersus(rr, c),
    vsBsonPct: pctSmallerVersus(rr, b),
    vsJsonPct: pctSmallerVersus(rr, j),
  };
}

/** Single object `{…}` or array `[…]` (batch), aligned with benchmark BSON rules. */
export function measureEncodedSizesForUserPayload(
  parsed: unknown,
  payloadLabel = 'custom',
): SizeComparisonRow {
  if (parsed === undefined) {
    throw new Error('Unsupported JSON: undefined.');
  }

  if (parsed === null) {
    throw new Error(
      'Bare null at the root is not supported. Put null inside an object instead, for example {"x":null}.',
    );
  }

  const isObjectLike = typeof parsed === 'object' && parsed !== null;
  if (!isObjectLike || parsed instanceof Uint8Array) {
    throw new Error(
      'Root must be a JSON object { … } or a JSON array [ … ]. Primitives at the root are not supported.',
    );
  }

  if (Array.isArray(parsed)) {
    const twilicEncoded = encodeBatch(parsed as TwilicValue[]);
    const bsonEncoded = serializeBson({ records: parsed });
    const msgpackEncoded = encodeMsgpack(parsed);
    const cborEncoded = encodeCbor(parsed);
    const label = `${payloadLabel} (batch, ${parsed.length} values)`;
    return toSizeComparisonRow(
      label,
      twilicEncoded.byteLength,
      msgpackEncoded,
      cborEncoded,
      bsonEncoded,
      jsonBytes(parsed),
    );
  }

  const twilicEncoded = encode(parsed as TwilicValue);
  const rec = parsed as Record<string, unknown>;
  const msgpackEncoded = encodeMsgpack(rec);
  const cborEncoded = encodeCbor(rec);
  const bsonEncoded = serializeBson(rec);
  return toSizeComparisonRow(
    payloadLabel,
    twilicEncoded.byteLength,
    msgpackEncoded,
    cborEncoded,
    bsonEncoded,
    jsonBytes(parsed),
  );
}

/**
 * Produced bytes and reduction percentages aligned with benchmark encoded size rows
 * (`benchmark/src/benchmark.ts`): same serializers and BSON shapes for batches.
 */
export function measureBenchEncodedSizes(dataset: BenchDataset): SizeComparisonRow[] {
  const { singleSmallJson, batchHomogeneousJson, batchMixedJson, patchSession } = dataset;

  const twilicEncodedSingle = encode(dataset.singleSmall);
  const twilicEncodedBatchHomogeneous = encodeBatch(dataset.batchHomogeneous);
  const twilicEncodedBatchMixed = encodeBatch(dataset.batchMixed);
  const twilicEncodedPatchSessionFirst = encode(patchSession.first);

  const jsonEncodedSingle = jsonBytes(singleSmallJson);
  const jsonEncodedBatchHomogeneous = jsonBytes(batchHomogeneousJson);
  const jsonEncodedBatchMixed = jsonBytes(batchMixedJson);

  const msgpackEncodedSingle = encodeMsgpack(singleSmallJson);
  const msgpackEncodedBatchHomogeneous = encodeMsgpack(batchHomogeneousJson);
  const msgpackEncodedBatchMixed = encodeMsgpack(batchMixedJson);

  const cborEncodedSingle = encodeCbor(singleSmallJson);
  const cborEncodedBatchHomogeneous = encodeCbor(batchHomogeneousJson);
  const cborEncodedBatchMixed = encodeCbor(batchMixedJson);

  const bsonEncodedSingle = serializeBson(singleSmallJson as Record<string, unknown>);
  const bsonEncodedBatchHomogeneous = serializeBson({
    records: batchHomogeneousJson,
  });
  const bsonEncodedBatchMixed = serializeBson({ records: batchMixedJson });

  const rawRows: Array<{
    payload: string;
    twilic: number;
    msgpack: Uint8Array;
    cbor: Uint8Array;
    bson: Uint8Array;
    json: number;
  }> = [
    {
      payload: 'single-small',
      twilic: twilicEncodedSingle.byteLength,
      msgpack: msgpackEncodedSingle,
      cbor: cborEncodedSingle,
      bson: bsonEncodedSingle,
      json: jsonEncodedSingle,
    },
    {
      payload: 'batch-homogeneous-256',
      twilic: twilicEncodedBatchHomogeneous.byteLength,
      msgpack: msgpackEncodedBatchHomogeneous,
      cbor: cborEncodedBatchHomogeneous,
      bson: bsonEncodedBatchHomogeneous,
      json: jsonEncodedBatchHomogeneous,
    },
    {
      payload: 'batch-mixed-256',
      twilic: twilicEncodedBatchMixed.byteLength,
      msgpack: msgpackEncodedBatchMixed,
      cbor: cborEncodedBatchMixed,
      bson: bsonEncodedBatchMixed,
      json: jsonEncodedBatchMixed,
    },
    {
      payload: 'session-patch-hot (first)',
      twilic: twilicEncodedPatchSessionFirst.byteLength,
      msgpack: encodeMsgpack(patchSession.first as Record<string, unknown>),
      cbor: encodeCbor(patchSession.first as Record<string, unknown>),
      bson: serializeBson(patchSession.first as Record<string, unknown>),
      json: jsonBytes(patchSession.first as Record<string, unknown>),
    },
  ];

  return rawRows.map((row) =>
    toSizeComparisonRow(row.payload, row.twilic, row.msgpack, row.cbor, row.bson, row.json),
  );
}

/** Verify round-trip for the payloads used in comparison (helps catch toolchain drift). */
export function sanityCheckDecodes(dataset: BenchDataset): void {
  const reEnc = (v: TwilicValue) => encode(v);
  const reDec = (u: Uint8Array) => decode(u);

  const check = (label: string, value: TwilicValue) => {
    const back = reDec(reEnc(value));
    if (!twilicRoundTripLooksEqual(value, back)) {
      throw new Error(`twilic round-trip mismatch: ${label}`);
    }
  };

  check('single-small', dataset.singleSmall);
  check('patch first', dataset.patchSession.first);

  decodeMsgpack(encodeMsgpack(dataset.singleSmallJson));
  decodeCbor(encodeCbor(dataset.singleSmallJson));
  deserializeBson(serializeBson(dataset.singleSmallJson as Record<string, unknown>));
}
