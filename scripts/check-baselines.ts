import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASELINES, newRows, rebaselineFailures, type BaselineChange } from './lib/baseline-diff';
import { report } from './lib/ratchet';
import { ROOT } from './lib/source-files';

const REF = process.env.ARGUS_BASELINE_REF ?? 'redesign/main';

function usage(): never {
  console.log(`usage: bun scripts/check-baselines.ts

Compares every ratchet baseline with its version at the merge base of HEAD and ${REF}
(ARGUS_BASELINE_REF overrides the branch). Lowering a baseline is always allowed. Raising
one (a count up, a list or exception entry added, a floor or a lazy package dropped, a
suppression count up) fails unless this change adds a row to CONTEXT.md › Re-baselines
naming the baseline file and the entry (an entry cell may be a glob). A new row that
names nothing raised fails too.
${BASELINES.map((baseline) => `  ${baseline.path}`).join('\n')}`);
  process.exit(0);
}

function git(args: readonly string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function mergeBase(): string {
  const run = spawnSync('git', ['merge-base', 'HEAD', REF], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`no merge base between HEAD and ${REF}: ${run.stderr}`);
  return run.stdout.trim();
}

function atCommit(commit: string, path: string): string {
  const run = spawnSync('git', ['show', `${commit}:${path}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return run.status === 0 ? run.stdout : '';
}

const current = (path: string): string =>
  existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : '';

function main(): void {
  if (process.argv.includes('--help')) usage();
  git(['rev-parse', '--verify', 'HEAD']);
  const base = mergeBase();
  const changes: BaselineChange[] = BASELINES.map((baseline) => ({
    baseline,
    before: atCommit(base, baseline.path),
    after: current(baseline.path),
  }));
  const rows = newRows(atCommit(base, 'CONTEXT.md'), current('CONTEXT.md'));
  report(
    'check-baselines',
    rebaselineFailures(changes, rows),
    `${changes.length} baselines against ${base.slice(0, 7)}, ${rows.length} new rows`
  );
}

main();
