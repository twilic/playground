import type { Schema, TwilicValue } from '@twilic/core/advanced';

/** Bound profile schema aligned with twilic/examples/schema-example.json */
export const userRecordSchema: Schema = {
  schemaId: 42,
  name: 'UserRecordV1',
  fields: [
    {
      number: 1,
      name: 'id',
      logicalType: 'u32',
      required: true,
      min: 1,
      max: 10_000_000,
    },
    {
      number: 2,
      name: 'role',
      logicalType: 'string',
      required: true,
      enumValues: ['viewer', 'editor', 'admin'],
    },
    {
      number: 3,
      name: 'age',
      logicalType: 'u8',
      required: false,
      min: 0,
      max: 127,
      defaultValue: 0,
    },
    {
      number: 4,
      name: 'active',
      logicalType: 'bool',
      required: true,
    },
  ],
};

/** Example records from schema-example.json */
export const userRecordExampleRecords: TwilicValue[] = [
  { id: 1001, role: 'admin', age: 36, active: true },
  { id: 1002, role: 'viewer', active: false },
  { id: 1003, role: 'editor', age: 29, active: true },
];

export function makeUserRecordBatch256(): TwilicValue[] {
  const roles = ['viewer', 'editor', 'admin'] as const;
  return Array.from({ length: 256 }, (_, index) => {
    const id = index + 1;
    const role = roles[id % roles.length];
    const record: TwilicValue = {
      id,
      role,
      active: id % 2 === 0,
    };
    if (id % 3 !== 0) {
      (record as Record<string, TwilicValue>).age = 18 + (id % 50);
    }
    return record;
  });
}

export interface SchemaBenchScenario {
  id: string;
  label: string;
  records: TwilicValue[];
}

export function buildSchemaBenchScenarios(): SchemaBenchScenario[] {
  return [
    {
      id: 'user-record-1',
      label: 'user-record ×1',
      records: [userRecordExampleRecords[0]],
    },
    {
      id: 'user-record-3',
      label: 'user-record ×3',
      records: userRecordExampleRecords,
    },
    {
      id: 'user-record-256',
      label: 'user-record ×256 (homogeneous)',
      records: makeUserRecordBatch256(),
    },
  ];
}
