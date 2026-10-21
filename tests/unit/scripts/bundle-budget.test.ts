import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  budgetFailures,
  measureBundle,
  parseBundleBaseline,
} from '../../../scripts/lib/bundle-budget';

function withDist(lazyChunk: boolean, check: (dist: string) => void): void {
  const dist = mkdtempSync(join(tmpdir(), 'argus-dist-'));
  try {
    mkdirSync(join(dist, '_expo/static/js/web'), { recursive: true });
    writeFileSync(
      join(dist, 'index.html'),
      '<script src="/_expo/static/js/web/index-abc123.js" defer></script>'
    );
    writeFileSync(join(dist, '_expo/static/js/web/index-abc123.js'), 'x'.repeat(100));
    if (lazyChunk)
      writeFileSync(join(dist, '_expo/static/js/web/livekit-client-def456.js'), 'y'.repeat(50));
    check(dist);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}

describe('the bundle budget', () => {
  test('a bundle within its baseline, with its lazy chunk, passes', () => {
    withDist(true, (dist) => {
      const sizes = measureBundle(dist);
      expect(sizes.entryBytes).toBe(100);
      expect(
        budgetFailures(
          parseBundleBaseline('entry-chunk-bytes 100\ndist-bytes 500\nlazy livekit-client\n'),
          sizes
        )
      ).toEqual([]);
    });
  });

  test('an entry chunk or dist above its baseline fails', () => {
    withDist(true, (dist) => {
      const failures = budgetFailures(
        parseBundleBaseline('entry-chunk-bytes 99\ndist-bytes 100\n'),
        measureBundle(dist)
      );
      expect(failures).toContain('the entry chunk is 100 B, above its baseline 99 B');
      expect(failures.some((failure) => failure.startsWith('dist/ is'))).toBe(true);
    });
  });

  test('a lazy package without a chunk of its own fails', () => {
    withDist(false, (dist) => {
      const failures = budgetFailures(
        parseBundleBaseline('entry-chunk-bytes 100\ndist-bytes 500\nlazy livekit-client\n'),
        measureBundle(dist)
      );
      expect(failures).toEqual([
        'livekit-client has no chunk of its own: it was pulled into the entry chunk',
      ]);
    });
  });
});
