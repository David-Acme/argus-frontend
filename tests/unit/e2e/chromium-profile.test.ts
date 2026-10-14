import { describe, expect, test } from 'bun:test';
import { assertSocketFits, profileBase } from '../../e2e/support/chromium';

const onlyRuntimeDir = (path: string): boolean => path === '/run/user/1000';

describe('e2e chromium profile base', () => {
  test('uses XDG_RUNTIME_DIR when it names an existing directory, whatever TMPDIR is', () => {
    expect(profileBase({ XDG_RUNTIME_DIR: '/run/user/1000', TMPDIR: '/a/long/scratch/path' }, onlyRuntimeDir)).toBe(
      '/run/user/1000'
    );
  });

  test('falls back to /tmp when XDG_RUNTIME_DIR is absent, blank or not a directory', () => {
    expect(profileBase({ TMPDIR: '/a/long/scratch/path' }, onlyRuntimeDir)).toBe('/tmp');
    expect(profileBase({ XDG_RUNTIME_DIR: '   ' }, onlyRuntimeDir)).toBe('/tmp');
    expect(profileBase({ XDG_RUNTIME_DIR: '/run/user/9' }, onlyRuntimeDir)).toBe('/tmp');
  });

  test('accepts a profile whose singleton socket path stays under 100 bytes', () => {
    expect(() => assertSocketFits('/run/user/1000/argus-e2e-abc123')).not.toThrow();
  });

  test('refuses a profile whose singleton socket path would reach 100 bytes', () => {
    const profile = `/tmp/${'a'.repeat(90)}`;
    expect(() => assertSocketFits(profile)).toThrow(`profile path too long for chromium's socket: ${profile}`);
  });
});
