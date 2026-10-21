import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export interface GateRun {
  status: number | null;
  output: string;
}

export function runGate(
  script: string,
  files: Record<string, string>,
  args: string[] = []
): GateRun {
  const repo = mkdtempSync(join(tmpdir(), 'argus-gate-'));
  try {
    spawnSync('git', ['init', '-q'], { cwd: repo });
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(repo, dirname(path)), { recursive: true });
      writeFileSync(join(repo, path), content);
    }
    const gate = resolve(import.meta.dir, '../../../scripts', script);
    const run = spawnSync('bun', [gate, ...args], { cwd: repo, encoding: 'utf8' });
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}
