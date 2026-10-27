import { describe, expect, test } from 'bun:test';
import { parseAddress } from '@/features/auth/model/pairing-address';
import { notFoundRowsOf, pairingStateOf } from '@/features/auth/model/pairing-state';

const state = (patch: Partial<Parameters<typeof pairingStateOf>[0]>) =>
  pairingStateOf({ search: 'searching', error: null, manual: false, paired: false, ...patch });

describe('the pairing screen states', () => {
  test('discovery is stated as a fact while the code is typed', () => {
    expect(state({}).note).toEqual({ tone: 'info', key: 'screens.pairing.searching' });
    expect(state({ search: 'found' }).note).toEqual({ tone: 'ok', key: 'screens.pairing.found' });
    expect(state({ search: 'found' }).view).toBe('code');
  });

  test('a network that hides Argus opens the address', () => {
    expect(state({ search: 'missing' }).view).toBe('address');
    expect(state({ search: 'found', error: 'DISCOVERY_NOT_FOUND' }).view).toBe('address');
    expect(state({ search: 'found', manual: true }).view).toBe('address');
  });

  test('a wrong code is said under the code', () => {
    const wrong = state({ search: 'found', error: 'INVALID_PAIRING_CODE' });
    expect(wrong.codeError).toBe('screens.pairing.errors.invalid-code');
    expect(wrong.note).toEqual({ tone: 'ok', key: 'screens.pairing.found' });
  });

  test('a bad address is said under the address', () => {
    const bad = state({ manual: true, error: 'HOST_NOT_ALLOWED' });
    expect(bad.addressError).toBe('screens.pairing.errors.invalid-address');
    expect(bad.note).toBeNull();
  });

  test('a different identity stops on the mismatch screen', () => {
    expect(state({ error: 'FINGERPRINT_MISMATCH' }).view).toBe('mismatch');
    expect(state({ error: 'FINGERPRINT_MISMATCH', manual: true }).view).toBe('mismatch');
    expect(state({ error: 'HOST_NOT_ALLOWED' }).view).toBe('mismatch');
  });

  test('a network failure is one calm sentence, and pairing says it is done', () => {
    expect(state({ search: 'found', error: 'NETWORK_ERROR' }).note).toEqual({
      tone: 'alert',
      key: 'screens.pairing.errors.network',
    });
    expect(state({ search: 'found', error: 'ALREADY_PAIRED' }).note?.key).toBe(
      'screens.pairing.errors.already-paired'
    );
    expect(state({ search: 'found', paired: true }).note).toEqual({
      tone: 'ok',
      key: 'screens.pairing.paired',
    });
  });

  test('the not-found help speaks to the device in hand', () => {
    expect(notFoundRowsOf(true)[0]?.meta).toBe('screens.pairing.not-found.wifi.phone');
    expect(notFoundRowsOf(false)[0]?.meta).toBe('screens.pairing.not-found.wifi.desktop');
  });
});

describe('a typed address', () => {
  test('reads IPv4 and IPv6, with or without a port', () => {
    expect(parseAddress('192.168.1.20')).toMatchObject({ ip: '192.168.1.20' });
    expect(parseAddress(' 10.0.0.2:7042 ')).toEqual({ ip: '10.0.0.2', port: 7042 });
    expect(parseAddress('[fe80::1]:7042')).toEqual({ ip: 'fe80::1', port: 7042 });
  });

  test('refuses what is not an address', () => {
    expect(parseAddress('999.1.1.1')).toBeNull();
    expect(parseAddress('10.0.0.2:70000')).toBeNull();
    expect(parseAddress('argus')).toBeNull();
  });
});
