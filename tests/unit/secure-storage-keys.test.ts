import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NET_STORAGE_KEYS } from '@/shared/constants/net.constant';

const secureRs = readFileSync(join(import.meta.dir, '../../src-tauri/src/net/secure.rs'), 'utf8');

describe('desktop secure-storage allow-list', () => {
  test('the keyring accepts exactly the keys the app stores', () => {
    const block = secureRs.slice(secureRs.indexOf('ALLOWED_KEYS'), secureRs.indexOf('];'));
    const allowed = [...block.matchAll(/"([^"]+)"/g)].map(([, key]) => key).sort();
    expect(allowed).toEqual(Object.values(NET_STORAGE_KEYS).sort());
  });
});
