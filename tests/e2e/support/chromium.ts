import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHROMIUM = process.env.ARGUS_CHROMIUM ?? '/usr/bin/chromium';
const LISTENING = /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/;
const START_TIMEOUT_MS = 20000;
const SHORT_BASE = '/tmp';
const PROFILE_PREFIX = 'argus-e2e-';
const SOCKET_NAME = 'SingletonSocket';
const SOCKET_PATH_LIMIT = 100;

type Environment = Readonly<Record<string, string | undefined>>;

let running: { process: ChildProcess; endpoint: Promise<string>; profile: string } | null = null;

const isExistingDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

export function profileBase(env: Environment, isDirectory: (path: string) => boolean = isExistingDirectory): string {
  const runtime = env.XDG_RUNTIME_DIR?.trim() ?? '';
  return runtime !== '' && isDirectory(runtime) ? runtime : SHORT_BASE;
}

export function assertSocketFits(profile: string): void {
  if (Buffer.byteLength(join(profile, SOCKET_NAME)) >= SOCKET_PATH_LIMIT) {
    throw new Error(`profile path too long for chromium's socket: ${profile}`);
  }
}

const stop = (): void => {
  if (!running) return;
  running.process.kill('SIGKILL');
  rmSync(running.profile, { recursive: true, force: true });
  running = null;
};

const launch = (): Promise<string> => {
  const profile = mkdtempSync(join(profileBase(process.env), PROFILE_PREFIX));
  let kept = false;
  try {
    assertSocketFits(profile);
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
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
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
    kept = true;
    return endpoint;
  } finally {
    if (!kept) rmSync(profile, { recursive: true, force: true });
  }
};

export const cdpEndpoint = (): Promise<string> => running?.endpoint ?? launch();
