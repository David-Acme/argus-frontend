import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/source-files';

const CACHE_INPUTS = [
  'eslint.config.js',
  'eslint-suppressions.json',
  'package.json',
  'tsconfig.json',
  'src/global.css',
  'src/shared/theme/tokens.generated.css',
  'node_modules/uniwind/uniwind.css',
];

const ESLINT = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

function usage(): never {
  console.log(`usage: bun scripts/lint.ts <eslint arguments>

Runs ESLint with its cache under .cache/eslint/<key>/, where the key hashes the inputs a rule
reads besides the linted file (${CACHE_INPUTS.join(', ')}). A change to any of them starts a
fresh cache, so a cached result never outlives the theme or the config it was computed with.`);
  process.exit(0);
}

function cacheKey(): string {
  const hash = createHash('sha256');
  for (const input of CACHE_INPUTS) {
    const path = join(ROOT, input);
    hash.update(input);
    if (existsSync(path)) hash.update(readFileSync(path));
  }
  return hash.digest('hex').slice(0, 16);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('--help')) usage();
  const run = spawnSync(
    'node',
    [
      '--max-old-space-size=4096',
      ESLINT,
      ...args,
      '--cache',
      '--cache-strategy',
      'content',
      '--cache-location',
      join(ROOT, '.cache', 'eslint', cacheKey(), ''),
    ],
    { cwd: ROOT, stdio: 'inherit' }
  );
  process.exit(run.status ?? 1);
}

main();
