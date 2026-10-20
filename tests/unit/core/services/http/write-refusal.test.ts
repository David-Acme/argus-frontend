import { describe, expect, test } from 'bun:test';
import type { HttpMethod } from '@/core/types';
import {
  WRITE_NOT_SENT,
  WRITE_UNCONFIRMED,
  serverWrite,
  writeRefusal,
  writeRefusalCode,
} from '@/core/services/http/write-refusal';

const CHANGE_METHODS: readonly HttpMethod[] = ['POST', 'PATCH', 'PUT', 'DELETE'];
const READ_METHODS: readonly HttpMethod[] = ['GET'];

const neverLeft = (method: HttpMethod) => writeRefusal({ method, status: 0, code: 'NETWORK_ERROR' });

describe('what the app treats as a write the server must accept', () => {
  test('the change verbs are writes and a read is not', () => {
    expect(CHANGE_METHODS.map(serverWrite)).toEqual([true, true, true, true]);
    expect(READ_METHODS.map(serverWrite)).toEqual([false]);
  });
});

describe('a write that never reached the server', () => {
  test('every change verb is refused as unsent when the connection was never established', () => {
    expect(CHANGE_METHODS.map(neverLeft)).toEqual(['unsent', 'unsent', 'unsent', 'unsent']);
  });

  test('a write whose answer was lost is refused as unconfirmed', () => {
    expect(writeRefusal({ method: 'POST', status: 0, code: 'TIMEOUT' })).toBe('unconfirmed');
  });

  test('a connection that dropped after the request left is unconfirmed, never "not sent"', () => {
    expect(writeRefusal({ method: 'PATCH', status: 0, code: 'CONNECTION_LOST' })).toBe('unconfirmed');
    expect(writeRefusal({ method: 'GET', status: 0, code: 'CONNECTION_LOST' })).toBeNull();
  });

  test('a write the server answered keeps the server refusal', () => {
    expect(writeRefusal({ method: 'POST', status: 409, code: 'CONFLICT' })).toBeNull();
    expect(writeRefusal({ method: 'DELETE', status: 503, code: 'SERVICE_UNAVAILABLE' })).toBeNull();
    expect(writeRefusal({ method: 'PATCH', status: 403, code: 'MODULE_DISABLED' })).toBeNull();
  });

  test('a local refusal at status zero is not read as a lost write', () => {
    const codes = ['PAIRING_REQUIRED', 'STORAGE_ERROR', 'CERT_NOT_TRUSTED', 'HOST_NOT_ALLOWED'];
    expect(codes.map((code) => writeRefusal({ method: 'POST', status: 0, code }))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  test('a read that never left is no write refusal: the cache and the offline notice answer it', () => {
    expect(neverLeft('GET')).toBeNull();
  });

  test('each refusal names the code the copy is keyed on', () => {
    expect(writeRefusalCode('unsent')).toBe(WRITE_NOT_SENT);
    expect(writeRefusalCode('unconfirmed')).toBe(WRITE_UNCONFIRMED);
    expect(WRITE_NOT_SENT).not.toBe(WRITE_UNCONFIRMED);
  });
});
