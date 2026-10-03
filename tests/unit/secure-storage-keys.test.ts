import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NET_STORAGE_KEYS } from '@/shared/constants/net.constant';

const secureRs = readFileSync(join(import.meta.dir, '../../src-tauri/src/net/secure.rs'), 'utf8');

const keysOf = (name: string): string[] => {
  const start = secureRs.indexOf(`${name}:`);
  const block = secureRs.slice(start, secureRs.indexOf('];', start));
  return [...block.matchAll(/"([^"]+)"/g)].map(([, key = '']) => key);
};

describe('desktop secure-storage allow-list', () => {
  test('the keyring accepts exactly the keys the app stores', () => {
    const allowed = [...keysOf('WEBVIEW_KEYS'), ...keysOf('TRUST_KEYS')].sort();
    expect(allowed).toEqual(Object.values(NET_STORAGE_KEYS).sort());
  });

  test('only the desktop host writes the keys that decide whom Rust trusts', () => {
    expect(keysOf('TRUST_KEYS').sort()).toEqual(
      [NET_STORAGE_KEYS.caPem, NET_STORAGE_KEYS.caFingerprint, NET_STORAGE_KEYS.host, NET_STORAGE_KEYS.ip].sort(),
    );
  });
});
