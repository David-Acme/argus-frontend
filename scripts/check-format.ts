import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { compareLists, readLines, report } from './lib/ratchet';
import { ROOT } from './lib/source-files';

const BASELINE = 'scripts/lib/format-baseline.txt';
const SCOPE = ['src', 'scripts', 'tests'];
const PRETTIER = join(import.meta.dir, '..', 'node_modules', '.bin', 'prettier');

function usage(): never {
  console.log(`usage: bun scripts/check-format.ts [--print]

Runs prettier --list-different over the code files of ${SCOPE.join(', ')} and compares the
unformatted ones with ${BASELINE}: a file not on the list must be formatted, and a listed
file that is now formatted must leave the list in the same change.
  --print  print the current list of unformatted files`);
  process.exit(0);
}

function codeFiles(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', ...SCOPE], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => /\.(ts|tsx|js|mjs|cjs)$/.test(file));
}

function unformatted(files: readonly string[]): string[] {
  const run = spawnSync(PRETTIER, ['--list-different', ...files], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0 && run.status !== 1)
    throw new Error(`prettier failed with ${run.status}: ${run.stderr}`);
  return run.stdout
    .split('\n')
    .filter((line) => line.length > 0)
    .sort();
}

if (process.argv.includes('--help')) usage();
const files = codeFiles();
const current = unformatted(files);
if (process.argv.includes('--print')) console.log(current.join('\n'));
else
  report(
    'check-format',
    compareLists('unformatted', readLines(join(ROOT, BASELINE)), current),
    `${files.length} files, ${current.length} unformatted`
  );
