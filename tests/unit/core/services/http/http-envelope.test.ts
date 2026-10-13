import { describe, expect, test } from 'bun:test';
import { foreignRefusalCode, readEnvelope } from '@/core/services/http/http-envelope';

const envelope = (value: unknown) => JSON.stringify(value);

const DROGON_404 =
  '<html>\n<head><title>404 Not Found</title></head>\n<body bgcolor="white" text="black">\n' +
  '<center><h1>404 Not Found</h1></center>\n<hr><center>drogon/1.9.11</center>\n</body>\n</html>';

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

  test('a 404 without the envelope is an unreachable route, never NOT_FOUND', () => {
    expect(readEnvelope(404, DROGON_404).errors?.code).toBe('UNREACHABLE_ROUTE');
    expect(readEnvelope(404, '').errors?.code).toBe('UNREACHABLE_ROUTE');
    expect(readEnvelope(404, envelope({ message: 'Not Found' })).errors?.code).toBe('UNREACHABLE_ROUTE');
    expect(readEnvelope(404, envelope({ errors: { code: 'NOT_FOUND', message: 'gone' } })).errors?.code).toBe(
      'UNREACHABLE_ROUTE'
    );
    expect(readEnvelope(405, '<html>405</html>').errors?.code).toBe('UNREACHABLE_ROUTE');
  });

  test('a refusal without the envelope names only how far it got', () => {
    expect(readEnvelope(502, '<html>Bad gateway</html>').errors?.code).toBe('BAD_GATEWAY');
    expect(readEnvelope(503, '').errors?.code).toBe('SERVICE_UNAVAILABLE');
    expect(readEnvelope(500, envelope({ status: 500 })).errors?.code).toBe('INTERNAL_ERROR');
    expect(readEnvelope(408, '').errors?.code).toBe('TIMEOUT');
    expect(readEnvelope(429, '<html>slow down</html>').errors?.code).toBe('TOO_MANY_REQUESTS');
    expect(readEnvelope(403, '<html>Forbidden</html>').errors?.code).toBe('UNREACHABLE_ROUTE');
    expect(readEnvelope(418, envelope({ errors: { code: 7 } })).errors?.code).toBe('UNREACHABLE_ROUTE');
  });

  test('a 2xx answer that is not an envelope is an invalid response', () => {
    expect(readEnvelope(200, 'not json').errors?.code).toBe('INVALID_RESPONSE');
    expect(readEnvelope(200, '[1,2]').errors?.code).toBe('INVALID_RESPONSE');
    expect(readEnvelope(200, 'null').errors?.code).toBe('INVALID_RESPONSE');
    expect(readEnvelope(200, envelope({ status: 200, info: null, errors: { code: 7 } })).errors?.code).toBe(
      'INVALID_RESPONSE'
    );
  });

  test('a list of refusals keeps the first as the answer and every one beside it', () => {
    const list = [
      { code: 'INVITATION_MODULE_DISABLED', message: 'Revoked' },
      { code: 'MODULE_ID', message: 'surveillance' },
    ];
    const read = readEnvelope(410, envelope({ status: 410, info: null, errors: list }));
    expect(read.ok).toBe(false);
    expect(read.errors).toEqual({ code: 'INVITATION_MODULE_DISABLED', message: 'Revoked', list });
    expect(readEnvelope(409, envelope({ status: 409, info: null, errors: [] })).errors?.code).toBe(
      'UNREACHABLE_ROUTE'
    );
    expect(readEnvelope(409, envelope({ status: 409, info: null, errors: [{ code: 1 }] })).errors?.code).toBe(
      'UNREACHABLE_ROUTE'
    );
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

describe('foreignRefusalCode', () => {
  test('keeps a name only for the statuses that say how far a request got', () => {
    expect(foreignRefusalCode(408)).toBe('TIMEOUT');
    expect(foreignRefusalCode(429)).toBe('TOO_MANY_REQUESTS');
    expect(foreignRefusalCode(502)).toBe('BAD_GATEWAY');
    expect(foreignRefusalCode(503)).toBe('SERVICE_UNAVAILABLE');
    expect(foreignRefusalCode(504)).toBe('DEADLINE_EXCEEDED');
    expect(foreignRefusalCode(599)).toBe('INTERNAL_ERROR');
  });

  test('every other status is an unreachable route, never a code of the server', () => {
    for (const status of [400, 401, 403, 404, 405, 409, 410, 422, 451]) {
      expect(foreignRefusalCode(status)).toBe('UNREACHABLE_ROUTE');
    }
  });
});
