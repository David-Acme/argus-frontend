import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { expectShape } from '@/core/services/http/expect-shape';

const schema = z.object({ id: z.number() });
const reader = (info: unknown): { id: number } | null =>
  typeof info === 'object' && info !== null && typeof (info as { id?: unknown }).id === 'number'
    ? { id: (info as { id: number }).id }
    : null;

const answered = <T>(info: T) => ({ status: 200, ok: true, info, errors: null });
const refused = {
  status: 403,
  ok: false,
  info: null,
  errors: { code: 'FORBIDDEN', message: 'no' },
};

describe('expectShape', () => {
  test('a well-shaped answer yields its parsed info, through a schema or a reader', () => {
    expect(expectShape(answered({ id: 7, extra: true }), schema, 'The thing')).toEqual(
      answered({ id: 7 })
    );
    expect(expectShape(answered({ id: 7 }), reader, 'The thing')).toEqual(answered({ id: 7 }));
  });

  test('a refusal passes through untouched', () => {
    expect(expectShape(refused, schema, 'The thing')).toEqual(refused);
    expect(expectShape(refused, reader, 'The thing')).toEqual(refused);
  });

  test('a misshapen answer is INVALID_RESPONSE naming what was read', () => {
    for (const shape of [schema, reader]) {
      expect(expectShape(answered({ id: 'seven' }), shape, 'The thing')).toEqual({
        status: 200,
        ok: false,
        info: null,
        errors: { code: 'INVALID_RESPONSE', message: 'The thing is not in the expected shape' },
      });
    }
  });
});
