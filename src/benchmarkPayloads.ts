import type { RecurramValue } from 'recurram/advanced';
import { toCompactJson, toTransportJson } from 'recurram/advanced';

function makeSingleSmallDataset(): RecurramValue {
  return {
    id: 1234,
    userId: 987654,
    name: 'alice',
    active: true,
    score: 98.5,
    tags: ['edge', 'premium', 'ap-northeast-1'],
    profile: {
      country: 'JP',
      locale: 'ja-JP',
      timeZone: 'Asia/Tokyo',
    },
  };
}

function makeBatchHomogeneousDataset(): RecurramValue[] {
  return Array.from({ length: 256 }, (_, index) => {
    const id = index + 1;
    return {
      id,
      userId: 100000 + id,
      active: id % 2 === 0,
      tier: id % 3 === 0 ? 'gold' : 'standard',
      country: id % 5 === 0 ? 'US' : 'JP',
      usage: {
        requests: 5000 + id,
        errors: id % 17,
      },
    };
  });
}

function makeBatchMixedDataset(): RecurramValue[] {
  return Array.from({ length: 256 }, (_, index): RecurramValue => {
    const id = index + 1;
    const kind = index % 4;
    if (kind === 0) {
      return {
        id,
        tenant: `tenant-${(id % 11) + 1}`,
        active: id % 2 === 0,
        metrics: {
          requests: 50000 + id * 3,
          errors: id % 19,
          latencyMs: 12.5 + (id % 7),
        },
        tags: [`region-${id % 3}`, `tier-${id % 5}`],
      };
    }
    if (kind === 1) {
      return {
        id,
        user: {
          name: `user-${id}`,
          age: 20 + (id % 30),
          roles: id % 2 === 0 ? ['admin', 'editor'] : ['viewer'],
        },
        active: id % 3 !== 0,
        notes: id % 5 === 0 ? null : `note-${id}`,
      };
    }
    if (kind === 2) {
      return {
        id,
        flags: [id % 2 === 0, id % 3 === 0, id % 5 === 0],
        payload: {
          count: 1000 + id,
          checksum: `sha-${(id * 17).toString(16)}`,
          nested: {
            alpha: id % 7,
            beta: id % 11,
          },
        },
      };
    }
    return {
      id,
      event: `event-${id % 13}`,
      source: `source-${id % 9}`,
      attrs: {
        region: id % 2 === 0 ? 'ap-northeast-1' : 'us-east-1',
        plan: id % 3 === 0 ? 'pro' : 'basic',
        score: 1000 + id,
      },
    };
  });
}

/** Mirrors `Dataset` payloads in `recurram-bench/src/benchmark.ts`. */
export interface BenchDataset {
  singleSmall: RecurramValue;
  singleSmallJson: Record<string, unknown>;
  batchHomogeneous: RecurramValue[];
  batchHomogeneousJson: unknown[];
  batchMixed: RecurramValue[];
  batchMixedJson: unknown[];
  patchSession: {
    first: RecurramValue;
    nextA: RecurramValue;
    nextB: RecurramValue;
    firstTransport: string;
    nextATransport: string;
    nextBTransport: string;
    firstCompact: string;
    nextACompact: string;
    nextBCompact: string;
  };
}

export function buildBenchDataset(): BenchDataset {
  const singleSmall = makeSingleSmallDataset();
  const batchHomogeneous = makeBatchHomogeneousDataset();
  const batchMixed = makeBatchMixedDataset();

  const patchSessionFirst: RecurramValue = {
    id: 9001,
    status: 'active',
    score: 99.1,
    profile: {
      country: 'JP',
      locale: 'ja-JP',
      timeZone: 'Asia/Tokyo',
    },
  };
  const patchSessionNextA: RecurramValue = {
    id: 9001,
    status: 'active',
    score: 99.2,
    profile: {
      country: 'JP',
      locale: 'ja-JP',
      timeZone: 'Asia/Seoul',
    },
  };
  const patchSessionNextB: RecurramValue = {
    id: 9001,
    status: 'active',
    score: 99.3,
    profile: {
      country: 'JP',
      locale: 'ja-JP',
      timeZone: 'Asia/Tokyo',
    },
  };

  return {
    singleSmall,
    singleSmallJson: singleSmall as Record<string, unknown>,
    batchHomogeneous,
    batchHomogeneousJson: batchHomogeneous as unknown[],
    batchMixed,
    batchMixedJson: batchMixed as unknown[],
    patchSession: {
      first: patchSessionFirst,
      nextA: patchSessionNextA,
      nextB: patchSessionNextB,
      firstTransport: toTransportJson(patchSessionFirst),
      nextATransport: toTransportJson(patchSessionNextA),
      nextBTransport: toTransportJson(patchSessionNextB),
      firstCompact: toCompactJson(patchSessionFirst),
      nextACompact: toCompactJson(patchSessionNextA),
      nextBCompact: toCompactJson(patchSessionNextB),
    },
  };
}
