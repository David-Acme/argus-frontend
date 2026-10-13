import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROMIUM = process.env.ARGUS_CHROMIUM ?? '/usr/bin/chromium';
const LISTENING = /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/;
const START_TIMEOUT_MS = 20000;

let running: { process: ChildProcess; endpoint: Promise<string>; profile: string } | null = null;

const stop = (): void => {
  if (!running) return;
  running.process.kill('SIGKILL');
  rmSync(running.profile, { recursive: true, force: true });
  running = null;
};

const launch = (): Promise<string> => {
  const profile = mkdtempSync(join(tmpdir(), 'argus-e2e-chromium-'));
  const child = spawn(
    CHROMIUM,
    [
      '--headless=new',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--metrics-recording-only',
      '--force-prefers-reduced-motion',
      '--lang=en-US',
      '--font-render-hinting=none',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, TZ: 'America/Lima', LANG: 'en_US.UTF-8' } }
  );
  const endpoint = new Promise<string>((resolve, reject) => {
    let seen = '';
    const timer = setTimeout(() => reject(new Error(`chromium did not open its DevTools port: ${seen.slice(-400)}`)), START_TIMEOUT_MS);
    child.stderr?.on('data', (chunk: Buffer) => {
      seen += chunk.toString();
      const match = LISTENING.exec(seen);
      if (!match?.[1]) return;
      clearTimeout(timer);
      resolve(match[1]);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`chromium exited with ${String(code)} before it listened`));
    });
  });
  running = { process: child, endpoint, profile };
  process.once('exit', stop);
  return endpoint;
};

export const cdpEndpoint = (): Promise<string> => running?.endpoint ?? launch();
