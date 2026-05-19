import type { TwilicValue } from '@twilic/core/advanced';

/** JSON-shaped UserRecordV1 used across schema-first codecs. */
export interface SchemaUserRecord {
  id: number;
  role: string;
  age?: number;
  active: boolean;
}

export function toSchemaRecords(records: TwilicValue[]): SchemaUserRecord[] {
  return records.map((raw) => {
    const rec = raw as Record<string, unknown>;
    const out: SchemaUserRecord = {
      id: Number(rec.id),
      role: String(rec.role),
      active: Boolean(rec.active),
    };
    if (rec.age !== undefined && rec.age !== null) {
      out.age = Number(rec.age);
    }
    return out;
  });
}
