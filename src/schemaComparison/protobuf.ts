import protobuf from 'protobufjs';

import type { SchemaUserRecord } from './records.js';

const USER_RECORD_PROTO = `
syntax = "proto3";

message UserRecordV1 {
  uint32 id = 1;
  string role = 2;
  uint32 age = 3;
  bool active = 4;
}

message UserRecordList {
  repeated UserRecordV1 records = 1;
}
`;

export interface ProtobufCodec {
  encodeStream(records: SchemaUserRecord[]): Uint8Array;
  encodeRepeated(records: SchemaUserRecord[]): Uint8Array;
}

export function createProtobufCodec(): ProtobufCodec {
  const root = protobuf.parse(USER_RECORD_PROTO).root;
  const UserRecordV1 = root.lookupType('UserRecordV1');
  const UserRecordList = root.lookupType('UserRecordList');

  if (!UserRecordV1 || !UserRecordList) {
    throw new Error('protobuf: failed to load UserRecordV1 types');
  }

  return {
    encodeStream(records) {
      const chunks = records.map((record) => {
        const message = UserRecordV1.create(record);
        const err = UserRecordV1.verify(message);
        if (err) {
          throw new Error(`protobuf verify: ${err}`);
        }
        return UserRecordV1.encode(message).finish();
      });
      const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return out;
    },
    encodeRepeated(records) {
      const message = UserRecordList.create({ records });
      const err = UserRecordList.verify(message);
      if (err) {
        throw new Error(`protobuf verify: ${err}`);
      }
      return UserRecordList.encode(message).finish();
    },
  };
}
