import { createArrowCodec, type ArrowCodec } from './arrow.js';
import { createAvroCodec, type AvroCodec } from './avro.js';
import { createFlatBuffersCodec, type FlatBuffersCodec } from './flatbuffers.js';
import { createProtobufCodec, type ProtobufCodec } from './protobuf.js';

export interface SchemaCodecBundle {
  protobuf: ProtobufCodec;
  avro: AvroCodec;
  flatbuffers: FlatBuffersCodec;
  arrow: ArrowCodec;
}

export function createSchemaCodecs(): SchemaCodecBundle {
  return {
    protobuf: createProtobufCodec(),
    avro: createAvroCodec(),
    flatbuffers: createFlatBuffersCodec(),
    arrow: createArrowCodec(),
  };
}
