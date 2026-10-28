import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { compareCounts, readCounts, report } from './lib/ratchet';
import { unusedCounts } from './lib/report-counts';
import { ROOT } from './lib/source-files';

const BASELINE = 'scripts/lib/unused-baseline.txt';
const KNIP = 'knip@6.41.0';

function usage(): never {
  console.log(`usage: bun scripts/check-unused.ts [--print]

Runs ${KNIP} (through bunx, configured by knip.json) and compares the unused files,
dependencies, unlisted dependencies, exports and types with ${BASELINE}: a count above its
baseline fails, and a count below it must lower the baseline in the same change.
Unresolved imports are not counted: knip does not read the .native/.web suffixes, and tsc
already resolves every import.
  --print  print the current counts`);
  process.exit(0);
}

function measure(): ReturnType<typeof unusedCounts> {
  const run = spawnSync('bunx', ['--bun', KNIP, '--reporter', 'json', '--no-progress'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0 && run.status !== 1)
    throw new Error(`knip failed with ${run.status}: ${run.stderr}`);
  return unusedCounts(JSON.parse(run.stdout));
}

if (process.argv.includes('--help')) usage();
const current = measure();
if (process.argv.includes('--print'))
  for (const [metric, value] of current) console.log(`${metric} ${value}`);
else
  report(
    'check-unused',
    compareCounts(readCounts(join(ROOT, BASELINE)), current),
    [...current].map(([metric, value]) => `${value} ${metric}`).join(', ')
  );
