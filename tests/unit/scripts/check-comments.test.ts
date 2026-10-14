import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const GATE = resolve(import.meta.dir, '../../../scripts/check-comments.ts');

interface GateRun {
  status: number | null;
  output: string;
}

function gateOver(files: Record<string, string | Uint8Array>): GateRun {
  const repo = mkdtempSync(join(tmpdir(), 'check-comments-'));
  try {
    spawnSync('git', ['init', '-q'], { cwd: repo });
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(repo, dirname(path)), { recursive: true });
      writeFileSync(join(repo, path), content);
    }
    const run = spawnSync('bun', [GATE], { cwd: repo, encoding: 'utf8' });
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

describe('check-comments on html and binary assets', () => {
  test('an html page without inline code passes', () => {
    const run = gateOver({ 'public/call/index.html': '<!doctype html><html><body><p>x</p></body></html>\n' });
    expect(run.status).toBe(0);
  });

  test('an html page that loads its script from its own file passes', () => {
    const run = gateOver({ 'public/call/index.html': '<html><body><script src="call-window.js"></script></body></html>\n' });
    expect(run.status).toBe(0);
  });

  test('an html page with an inline script fails and names the file', () => {
    const run = gateOver({ 'public/call/index.html': '<html><script>// note\nconst a = 1;</script></html>\n' });
    expect(run.status).toBe(1);
    expect(run.output).toContain('public/call/index.html: inline <script> or <style>');
  });

  test('an html page with an inline style fails', () => {
    const run = gateOver({ 'public/call/index.html': '<html><style>/* note */ p { color: red; }</style></html>\n' });
    expect(run.status).toBe(1);
    expect(run.output).toContain('inline <script> or <style>');
  });

  test('a wav asset is a silent binary and passes', () => {
    const run = gateOver({ 'public/call/ringtone.wav': new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x01]) });
    expect(run.status).toBe(0);
    expect(run.output).not.toContain('not classified');
  });
});
