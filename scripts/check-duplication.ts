import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareCounts, readCounts, report } from './lib/ratchet';
import { duplicationCounts } from './lib/report-counts';
import { ROOT } from './lib/source-files';

const BASELINE = 'scripts/lib/duplication-baseline.txt';
const JSCPD = 'jscpd@4.0.5';

function usage(): never {
  console.log(`usage: bun scripts/check-duplication.ts [--print]

Runs ${JSCPD} (through bunx, configured by .jscpd.json) over src and compares the
duplicated lines and clones with ${BASELINE}: a count above its baseline fails, and a
count below it must lower the baseline in the same change.
  --print  print the current counts`);
  process.exit(0);
}

function measure(): ReturnType<typeof duplicationCounts> {
  const output = mkdtempSync(join(tmpdir(), 'argus-jscpd-'));
  try {
    const run = spawnSync('bunx', ['--bun', JSCPD, '--config', '.jscpd.json', '--output', output], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (run.status !== 0) throw new Error(`jscpd failed with ${run.status}: ${run.stderr}`);
    return duplicationCounts(JSON.parse(readFileSync(join(output, 'jscpd-report.json'), 'utf8')));
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

if (process.argv.includes('--help')) usage();
const current = measure();
if (process.argv.includes('--print'))
  for (const [metric, value] of current) console.log(`${metric} ${value}`);
else
  report(
    'check-duplication',
    compareCounts(readCounts(join(ROOT, BASELINE)), current),
    `${current.get('duplicated-lines')} duplicated lines in ${current.get('clones')} clones`
  );
