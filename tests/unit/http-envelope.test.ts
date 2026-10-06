import { describe, expect, test } from 'bun:test';
import { readEnvelope, statusErrorCode } from '@/core/services/http/http-envelope';

const envelope = (value: unknown) => JSON.stringify(value);

describe('readEnvelope', () => {
  test('a 2xx envelope yields its info', () => {
    expect(readEnvelope(200, envelope({ status: 200, info: { id: 7 }, errors: null }))).toEqual({
      status: 200,
      ok: true,
      info: { id: 7 },
      errors: null,
    });
    expect(readEnvelope(204, '')).toEqual({ status: 204, ok: true, info: null, errors: null });
  });

  test('the backend refusal is passed through as written', () => {
    const errors = { code: 'NOT_FOUND', message: 'Project not found' };
    expect(readEnvelope(404, envelope({ status: 404, info: null, errors }))).toEqual({
      status: 404,
      ok: false,
      info: null,
      errors,
    });
  });

  test('a refusal without an envelope is named after its status', () => {
    expect(readEnvelope(502, '<html>Bad gateway</html>').errors?.code).toBe('BAD_GATEWAY');
    expect(readEnvelope(503, '').errors?.code).toBe('SERVICE_UNAVAILABLE');
    expect(readEnvelope(500, envelope({ status: 500 })).errors?.code).toBe('INTERNAL_ERROR');
    expect(readEnvelope(418, envelope({ errors: { code: 7 } })).errors?.code).toBe('BAD_REQUEST');
  });

  test('a 2xx answer that is not an envelope is an invalid response', () => {
    expect(readEnvelope(200, 'not json').errors?.code).toBe('INVALID_RESPONSE');
    expect(readEnvelope(200, '[1,2]').errors?.code).toBe('INVALID_RESPONSE');
    expect(readEnvelope(200, 'null').errors?.code).toBe('INVALID_RESPONSE');
  });

  test('a list of refusals keeps the first as the answer and every one beside it', () => {
    const list = [
      { code: 'INVITATION_MODULE_DISABLED', message: 'Revoked' },
      { code: 'MODULE_ID', message: 'surveillance' },
    ];
    const read = readEnvelope(410, envelope({ status: 410, info: null, errors: list }));
    expect(read.ok).toBe(false);
    expect(read.errors).toEqual({ code: 'INVITATION_MODULE_DISABLED', message: 'Revoked', list });
    expect(readEnvelope(409, envelope({ errors: [] })).errors?.code).toBe('CONFLICT');
    expect(readEnvelope(409, envelope({ errors: [{ code: 1 }] })).errors?.code).toBe('CONFLICT');
  });

  test('the refusal of an uninstall while people hold the role keeps one holder per entry', () => {
    const list = [
      { code: 'MODULE_ROLES_HELD', message: 'People hold roles of this module; give each a new role to uninstall it' },
      { code: 'ROLE_HOLDER', message: '7:guard' },
      { code: 'ROLE_HOLDER', message: '9:guard' },
    ];
    const read = readEnvelope(409, envelope({ status: 409, info: null, errors: list }));
    expect(read.errors?.code).toBe('MODULE_ROLES_HELD');
    expect(read.errors?.list?.filter((entry) => entry.code === 'ROLE_HOLDER').map((entry) => entry.message)).toEqual([
      '7:guard',
      '9:guard',
    ]);
  });

  test('a 2xx answer that carries errors is a refusal', () => {
    const errors = { code: 'CONFLICT', message: 'Already changed' };
    expect(readEnvelope(200, envelope({ info: null, errors })).ok).toBe(false);
  });
});

describe('statusErrorCode', () => {
  test('maps the statuses the app explains to their backend codes', () => {
    expect(statusErrorCode(401)).toBe('UNAUTHORIZED');
    expect(statusErrorCode(403)).toBe('FORBIDDEN');
    expect(statusErrorCode(408)).toBe('TIMEOUT');
    expect(statusErrorCode(422)).toBe('VALIDATION_ERROR');
    expect(statusErrorCode(429)).toBe('TOO_MANY_REQUESTS');
    expect(statusErrorCode(504)).toBe('DEADLINE_EXCEEDED');
    expect(statusErrorCode(599)).toBe('INTERNAL_ERROR');
    expect(statusErrorCode(451)).toBe('BAD_REQUEST');
  });
});
