import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const QUALITY = 'scripts/lib/quality-baseline.txt';
const SUPPRESSIONS = 'eslint-suppressions.json';
const HEADER = '## Re-baselines\n\n| Baseline | Entries | Reason | Date |\n|---|---|---|---|\n';

type Tree = Record<string, string>;

function write(repo: string, files: Tree): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(repo, dirname(path)), { recursive: true });
    writeFileSync(join(repo, path), content);
  }
}

function baselines(before: Tree, after: Tree) {
  const repo = mkdtempSync(join(tmpdir(), 'argus-baselines-'));
  const git = (...args: string[]) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  try {
    git('init', '-q', '-b', 'redesign/main');
    git('config', 'user.email', 'gate@test');
    git('config', 'user.name', 'gate');
    write(repo, before);
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    git('checkout', '-q', '-b', 'work');
    write(repo, after);
    const gate = resolve(import.meta.dir, '../../../scripts/check-baselines.ts');
    const run = spawnSync('bun', [gate], { cwd: repo, encoding: 'utf8' });
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

const BASE: Tree = {
  [QUALITY]: 'hex-literal 3\nscanned-files 10\n',
  [SUPPRESSIONS]: JSON.stringify({ 'src/a.ts': { complexity: { count: 1 } } }),
  'CONTEXT.md': `${HEADER}`,
};

describe('check-baselines', () => {
  test('a lowered count passes without a row', () => {
    const run = baselines(BASE, { [QUALITY]: 'hex-literal 2\nscanned-files 11\n' });
    expect(run.status).toBe(0);
  });

  test('a raised count, a dropped floor and a new suppression fail without a row', () => {
    const run = baselines(BASE, {
      [QUALITY]: 'hex-literal 4\nscanned-files 9\n',
      [SUPPRESSIONS]: JSON.stringify({
        'src/a.ts': { complexity: { count: 1 } },
        'src/b.ts': { 'max-lines': { count: 1 } },
      }),
    });
    expect(run.status).toBe(1);
    expect(run.output).toContain(`${QUALITY}: hex-literal was raised`);
    expect(run.output).toContain(`${QUALITY}: scanned-files was raised`);
    expect(run.output).toContain(`${SUPPRESSIONS}: src/b.ts max-lines was raised`);
  });

  test('a raise named by a new Re-baselines row passes, a row that was already there does not', () => {
    const row = `| \`${QUALITY}\` | \`hex-literal\` | measured | 2026-10-20 |\n`;
    const named = baselines(BASE, {
      [QUALITY]: 'hex-literal 4\nscanned-files 10\n',
      'CONTEXT.md': `${HEADER}${row}`,
    });
    const stale = baselines(
      { ...BASE, 'CONTEXT.md': `${HEADER}${row}` },
      { [QUALITY]: 'hex-literal 4\nscanned-files 10\n' }
    );
    expect(named.status).toBe(0);
    expect(stale.output).toContain(`${QUALITY}: hex-literal was raised`);
  });

  test('a glob entry covers the matching keys, and a row that names nothing raised fails', () => {
    const glob = `| \`${SUPPRESSIONS}\` | \`src/** *\` | moved | 2026-10-20 |\n`;
    const idle = `| \`${QUALITY}\` | \`style-object\` | nothing | 2026-10-20 |\n`;
    const run = baselines(BASE, {
      [SUPPRESSIONS]: JSON.stringify({ 'src/a.ts': { complexity: { count: 2 } } }),
      'CONTEXT.md': `${HEADER}${glob}${idle}`,
    });
    expect(run.output).not.toContain('src/a.ts complexity was raised');
    expect(run.output).toContain(
      `the Re-baselines row for ${QUALITY} names nothing this change raises`
    );
  });
});
