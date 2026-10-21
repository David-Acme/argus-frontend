import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileCounters } from './lib/quality/file-counters';
import { sharedValueReads } from './lib/quality/shared-values';
import { memoCalls, memoSymbol, syntaxCounters, type Counter } from './lib/quality/syntax-counters';
import { untestedComponents } from './lib/quality/untested';
import {
  compareCounts,
  compareLists,
  formatCounts,
  readCounts,
  readLines,
  report,
  type Counts,
} from './lib/ratchet';
import { listFiles, readSource, ROOT, type SourceFile } from './lib/source-files';

const BASELINE = 'scripts/lib/quality-baseline.txt';
const UNTESTED = 'scripts/lib/untested-baseline.txt';
const MEMO_EXCEPTIONS = 'scripts/lib/memo-exceptions.txt';
const SCANNED = 'scanned-files';

function usage(): never {
  console.log(`usage: bun scripts/check-quality.ts [--print | --print-untested]

Counts the quality metrics of src/ and tests/ and compares them with ${BASELINE}:
a count above its baseline fails, a count below fails until the baseline is lowered
in the same change, and fewer scanned files than recorded fails. Manual memoizations
listed in ${MEMO_EXCEPTIONS} (path symbol reason) are not counted. The untested
components and screens are compared one by one with ${UNTESTED}.
  --print           print the current counts in the baseline's format
  --print-untested  print the current untested list`);
  process.exit(0);
}

function memoExceptions(): Set<string> {
  if (!existsSync(join(ROOT, MEMO_EXCEPTIONS))) return new Set();
  return new Set(
    readLines(join(ROOT, MEMO_EXCEPTIONS)).map((line) => line.split(/\s+/).slice(0, 2).join(' '))
  );
}

const manualMemo = (exceptions: ReadonlySet<string>): Counter => ({
  name: 'manual-memo',
  applies: (path) => path.startsWith('src/'),
  count: (file: SourceFile) =>
    memoCalls(file).filter((call) => !exceptions.has(`${file.path} ${memoSymbol(call)}`)).length,
});

function measure(files: readonly string[], counters: readonly Counter[]): Counts {
  const counts: Counts = new Map(counters.map((counter) => [counter.name, 0]));
  for (const path of files) {
    const file = readSource(path);
    for (const counter of counters) {
      if (counter.applies(path))
        counts.set(counter.name, (counts.get(counter.name) ?? 0) + counter.count(file));
    }
  }
  return counts;
}

function scannedFailure(baseline: Counts, scanned: number): string[] {
  const recorded = baseline.get(SCANNED) ?? 0;
  return scanned < recorded
    ? [`${SCANNED}: ${scanned} files scanned, fewer than the ${recorded} recorded`]
    : [];
}

function main(): void {
  if (process.argv.includes('--help')) usage();
  const files = listFiles('src', 'tests');
  const sources = files.filter((path) => path.startsWith('src/'));
  const tests = files.filter((path) => path.startsWith('tests/'));
  const counters = [...syntaxCounters, ...fileCounters, manualMemo(memoExceptions())];
  const counts = measure(files, counters);
  const sharedReads = [...sharedValueReads(sources).values()].reduce(
    (sum, count) => sum + count,
    0
  );
  const untested = untestedComponents(sources, tests);
  counts.set('shared-value-dot-value', sharedReads);
  counts.set('untested-component-or-screen', untested.length);
  if (process.argv.includes('--print-untested')) return void console.log(untested.join('\n'));
  if (process.argv.includes('--print'))
    return void process.stdout.write(formatCounts(counts.set(SCANNED, files.length)));
  const baseline = readCounts(join(ROOT, BASELINE));
  const recorded = new Map([...baseline].filter(([metric]) => metric !== SCANNED));
  const failures = [
    ...scannedFailure(baseline, files.length),
    ...compareCounts(recorded, counts),
    ...compareLists('untested-component-or-screen', readLines(join(ROOT, UNTESTED)), untested),
  ];
  report('check-quality', failures, `${files.length} files, ${counts.size} counters`);
}

main();
