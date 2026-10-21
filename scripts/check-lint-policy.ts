import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import {
  parseExceptionRows,
  policyFailures,
  type ConfigBlock,
  type ResolvedConfig,
} from './lib/lint-policy';
import { report } from './lib/ratchet';
import { ROOT } from './lib/source-files';
import { execFileSync } from 'node:child_process';

const SCOPE = ['src', 'scripts'];

function usage(): never {
  console.log(`usage: bun scripts/check-lint-policy.ts

Resolves the ESLint config of every file bun run lint checks (${SCOPE.join(', ')}) and fails on
a rule at 'warn', inline configuration not disabled, a rule turned off that the
eslint-config-expo base does not turn off without a row in CONTEXT.md › Lint exceptions,
or a row that turns nothing off. A rule a config block sets for its files but leaves out
of a file through the block's ignores is an exemption, counted like an 'off'. Every path
of a row must turn something off, and every eslint-suppressions.json entry must name a
file lint checks and a rule that is on for it.`);
  process.exit(0);
}

function lintedFiles(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', ...SCOPE], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => /\.(ts|tsx|js|mjs|cjs)$/.test(file));
}

async function resolveAll(
  eslint: ESLint,
  files: readonly string[]
): Promise<Map<string, ResolvedConfig>> {
  const resolved = new Map<string, ResolvedConfig>();
  for (const file of files) {
    if (await eslint.isPathIgnored(file)) continue;
    resolved.set(file, (await eslint.calculateConfigForFile(file)) as ResolvedConfig);
  }
  return resolved;
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) usage();
  const files = lintedFiles();
  const expo = (await import(join(ROOT, 'node_modules/eslint-config-expo/flat.js'))) as {
    default: ESLint.Options['overrideConfig'];
  };
  const resolved = await resolveAll(new ESLint({ cwd: ROOT }), files);
  const base = await resolveAll(
    new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: expo.default }),
    [...resolved.keys()]
  );
  const rows = parseExceptionRows(readFileSync(join(ROOT, 'CONTEXT.md'), 'utf8'));
  const blocks = (await import(join(ROOT, 'eslint.config.js'))) as { default: ConfigBlock[] };
  report(
    'check-lint-policy',
    policyFailures({
      resolved,
      base,
      rows,
      blocks: blocks.default,
      suppressions: JSON.parse(
        readFileSync(join(ROOT, 'eslint-suppressions.json'), 'utf8')
      ) as Record<string, Record<string, unknown>>,
    }),
    `${resolved.size} files, ${rows.length} exception rows`
  );
}

await main();
