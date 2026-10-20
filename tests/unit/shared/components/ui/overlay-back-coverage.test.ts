import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(import.meta.dir, '../../../../../src');
const OPENS_AN_OVERLAY = /<(?:[A-Za-z]+Primitive\.)?Portal\b|<SheetPortal\b|<DialogPortal\b/;
const HANDLES_BACK = /useOverlayBack\(|BackHandler\.addEventListener\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.tsx') ? [path] : [];
  });
}

describe('every overlay closes on Android Back before the screen behind it', () => {
  const overlays = sourceFiles(SRC).filter((path) => OPENS_AN_OVERLAY.test(readFileSync(path, 'utf8')));

  test('the overlays were found', () => {
    expect(overlays.length).toBeGreaterThanOrEqual(8);
  });

  test('each file that opens a portal overlay handles Back while it is open', () => {
    const unguarded = overlays
      .filter((path) => !HANDLES_BACK.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));
    expect(unguarded).toEqual([]);
  });
});
