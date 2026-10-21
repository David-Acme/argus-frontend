import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readLines } from '../ratchet';
import { readSource, ROOT } from '../source-files';
import { memoCalls, memoSymbol } from './syntax-counters';

export const MEMO_EXCEPTIONS = 'scripts/lib/memo-exceptions.txt';

const memoKey = (line: string) => line.split(/\s+/).slice(0, 2).join(' ');

function memoLines(): string[] {
  return existsSync(join(ROOT, MEMO_EXCEPTIONS)) ? readLines(join(ROOT, MEMO_EXCEPTIONS)) : [];
}

export function memoExceptions(): Set<string> {
  return new Set(memoLines().map(memoKey));
}

function memoKeys(files: readonly string[]): Map<string, number> {
  const calls = new Map<string, number>();
  for (const path of files.filter((file) => file.startsWith('src/'))) {
    for (const call of memoCalls(readSource(path))) {
      const key = `${path} ${memoSymbol(call)}`;
      calls.set(key, (calls.get(key) ?? 0) + 1);
    }
  }
  return calls;
}

export function memoFailures(files: readonly string[]): string[] {
  const lines = memoLines();
  if (lines.length === 0) return [];
  const calls = memoKeys(files);
  return lines.flatMap((line) => {
    const key = memoKey(line);
    const found = calls.get(key) ?? 0;
    if (line.split(/\s+/).length < 3) return [`${MEMO_EXCEPTIONS}: ${key} has no reason`];
    if (found === 0) return [`${MEMO_EXCEPTIONS}: ${key} names no manual memoization`];
    if (found > 1)
      return [`${MEMO_EXCEPTIONS}: ${key} names ${found} memoizations; an exception names one`];
    return [];
  });
}
