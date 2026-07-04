import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatUserPayloadText, parseUserPayloadText } from './userPayloadText.ts';

describe('parseUserPayloadText', () => {
  it('parses a valid root object', () => {
    assert.deepEqual(parseUserPayloadText('{"name":"Ada","count":2}'), {
      name: 'Ada',
      count: 2,
    });
  });

  it('parses a valid root array', () => {
    assert.deepEqual(parseUserPayloadText('[{"id":1},{"id":2}]'), [
      { id: 1 },
      { id: 2 },
    ]);
  });

  it('parses JSONL and skips blank lines', () => {
    assert.deepEqual(parseUserPayloadText('{"id":1}\n\n  {"id":2}\n'), [
      { id: 1 },
      { id: 2 },
    ]);
  });

  it('throws for empty input', () => {
    assert.throws(() => parseUserPayloadText('   \n\t'), /Empty payload\./);
  });

  it('throws with the line number for invalid JSONL', () => {
    assert.throws(
      () => parseUserPayloadText('{"id":1}\nnot-json'),
      /Invalid JSON on line 2\./,
    );
  });

  it('throws when JSONL contains only empty lines', () => {
    assert.throws(
      () => parseUserPayloadText('\n\n'),
      /Empty payload\./,
    );
  });
});

describe('formatUserPayloadText', () => {
  it('pretty-prints a parsed payload', () => {
    assert.equal(
      formatUserPayloadText('{"name":"Ada","tags":["json","test"]}'),
      '{\n  "name": "Ada",\n  "tags": [\n    "json",\n    "test"\n  ]\n}',
    );
  });
});
