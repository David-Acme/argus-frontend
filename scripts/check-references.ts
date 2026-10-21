import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { report } from './lib/ratchet';
import { referenceFailures } from './lib/references';
import { ROOT } from './lib/source-files';

function usage(): never {
  console.log(`usage: bun scripts/check-references.ts

Every [key] cited in AGENTS.md, every CONTEXT.md and docs/plans/*.md exists in
docs/references.md, a [family-*] citation matches at least one key, and every
reference row has a URL. Code spans, fenced blocks and markdown links are not citations.`);
  process.exit(0);
}

function documents(): Map<string, string> {
  const listed = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      'AGENTS.md',
      '*CONTEXT.md',
      'docs/plans/*.md',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
    }
  );
  const paths = listed.split('\n').filter((path) => path.endsWith('.md'));
  return new Map(paths.map((path) => [path, readFileSync(join(ROOT, path), 'utf8')]));
}

if (process.argv.includes('--help')) usage();
const docs = documents();
const failures = referenceFailures(readFileSync(join(ROOT, 'docs/references.md'), 'utf8'), docs);
report('check-references', failures, `${docs.size} documents`);
