import type { BrowserContext } from 'playwright-core';
import { ownerContext, type RouteSpec } from '../support/fake-argus';
import { ownerDevice, unpairedDevice } from '../support/seed';
import type { ShimSeed } from '../support/tauri-shim';
import { sleep, type Scene } from '../support/ui-map/capture';
import type { ScreenSpec } from '../support/ui-map/scenario';
import { button, fill, say, tapText } from '../support/ui-map/text';

const signedOut = (): ShimSeed => {
  const base = ownerDevice('A');
  const secure = { ...base.secure };
  delete secure['net.accessToken'];
  delete secure['net.refreshToken'];
  delete secure['net.deviceCredential'];
  return { device: 'A', secure, local: {} };
};

const CHALLENGE = 'a'.repeat(64);

const STATUS_OWNER: RouteSpec = { method: 'GET', path: '/pairing/status', info: { paired: true, hasOwner: true } };

const LOGIN_QR: RouteSpec[] = [
  STATUS_OWNER,
  { method: 'POST', path: '/auth/device-login', info: { challengeId: CHALLENGE, expiresAt: 1791835500 } },
  { method: 'GET', path: `/auth/device-login/${CHALLENGE}`, info: { status: 'pending' } },
];

const hold = (pattern: string) => async (context: BrowserContext): Promise<void> => {
  await context.route(pattern, () => undefined);
};

function stallSecureReads(): void {
  const scope = window as unknown as Record<string, { invoke: (command: string, ...rest: unknown[]) => Promise<unknown> }>;
  const internals = scope.__TAURI_INTERNALS__;
  if (!internals) return;
  const original = internals.invoke;
  internals.invoke = (command: string, ...rest: unknown[]) =>
    command === 'argus_secure_get' ? new Promise(() => undefined) : original(command, ...rest);
}

const privacyMe = (patch: Record<string, unknown> = {}) => {
  const off = { presence: false, faceCameras: false, voiceLearning: false, cameraAudio: false };
  return {
    decided: false,
    noticeVersion: 0,
    current: false,
    decidedAt: null,
    updatedAt: null,
    choices: off,
    effective: off,
    currentNoticeVersion: 2,
    household: { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true },
    ...patch,
  };
};

const late = (pattern: string, ms: number) => async (context: BrowserContext): Promise<void> => {
  await context.route(pattern, async (route) => {
    await sleep(ms);
    await route.continue();
  });
};

const gate = (me: Record<string, unknown>) => ({
  routes: [{ method: 'GET', path: '/privacy/me', info: me }],
  before: late('**/__api/privacy/me', 1500),
});

const pairingCode = async (scene: Scene, code: string): Promise<void> => {
  await scene.page.getByPlaceholder(say(scene, 'screens.pairing.code-placeholder')).first().fill(code);
  await sleep(200);
  await scene.page.getByRole('button', { name: say(scene, 'common.continue'), exact: true }).last().click();
  await sleep(1500);
};

const toPairing = async (scene: Scene): Promise<void> => {
  await tapText(scene, 'screens.welcome.cta');
  await sleep(800);
};

export const AUTH: ScreenSpec[] = [
  {
    screen: 'splash',
    route: '(root SessionGate)',
    path: '/',
    states: [
      {
        state: 'slow-keyring',
        before: async (context) => {
          await context.addInitScript(stallSecureReads);
        },
        act: async () => {
          await sleep(6800);
        },
        notes: 'BrandSplash after SPLASH_SLOW_MS with the Tauri keyring hint; secure reads stalled by an init script.',
      },
    ],
  },
  {
    screen: 'welcome',
    route: '/welcome',
    path: '/welcome',
    states: [
      { state: 'hero-still', seed: unpairedDevice('A'), main: true, notes: 'reduced motion: the resting pose' },
      {
        state: 'hero-motion-early',
        seed: unpairedDevice('A'),
        motion: true,
        notes: 'full motion, captured about 1-4 s after load (later viewports later in the intro)',
      },
      {
        state: 'hero-motion-settled',
        seed: unpairedDevice('A'),
        motion: true,
        act: async () => {
          await sleep(12500);
        },
        notes: 'full motion after the 12 s choreography',
      },
      { state: 'hero-signed-in-device', notes: 'a signed-in device can still open /welcome (no redirect)' },
    ],
  },
  {
    screen: 'pairing',
    route: '/welcome/pairing',
    path: '/welcome',
    states: [
      { state: 'idle', seed: unpairedDevice('A'), act: toPairing, main: true },
      {
        state: 'address-open',
        seed: unpairedDevice('A'),
        act: async (scene) => {
          await toPairing(scene);
          await tapText(scene, 'screens.pairing.address-open');
        },
      },
      {
        state: 'error-invalid-code',
        seed: unpairedDevice('A'),
        act: async (scene) => {
          await toPairing(scene);
          await pairingCode(scene, 'A1B2C3');
        },
      },
      {
        state: 'error-not-found',
        seed: unpairedDevice('A'),
        act: async (scene) => {
          await toPairing(scene);
          await pairingCode(scene, 'A1B2C3D4');
        },
      },
      {
        state: 'error-invalid-address',
        seed: unpairedDevice('A'),
        act: async (scene) => {
          await toPairing(scene);
          await tapText(scene, 'screens.pairing.address-open');
          await fill(scene, 'screens.pairing.address-label', '999.1.1.1');
          await pairingCode(scene, 'A1B2C3D4');
        },
      },
      {
        state: 'error-network',
        seed: unpairedDevice('A'),
        act: async (scene) => {
          await toPairing(scene);
          await tapText(scene, 'screens.pairing.address-open');
          await fill(scene, 'screens.pairing.address-label', '192.168.1.20');
          await pairingCode(scene, 'A1B2C3D4');
        },
        notes: 'the shim answers argus_pair with null, which the app reports as a network error',
      },
    ],
  },
  {
    screen: 'login',
    route: '/login',
    path: '/login',
    states: [
      { state: 'qr', seed: signedOut(), routes: LOGIN_QR, main: true },
      {
        state: 'loading',
        seed: signedOut(),
        before: hold('**/__api/pairing/status'),
        notes: 'GET /pairing/status held open',
      },
      {
        state: 'waiting-owner',
        seed: signedOut(),
        routes: [{ method: 'GET', path: '/pairing/status', info: { paired: true, hasOwner: false } }],
      },
      {
        state: 'expired',
        seed: signedOut(),
        routes: [...LOGIN_QR, { method: 'GET', path: `/auth/device-login/${CHALLENGE}`, info: { status: 'expired' } }],
        act: async () => {
          await sleep(2600);
        },
      },
      { state: 'error', seed: signedOut(), notes: 'no /pairing/status route: 404' },
      { state: 'error-unpaired-device', seed: unpairedDevice('A'), notes: 'an unpaired device opening /login directly' },
    ],
  },
  {
    screen: 'privacy-gate',
    route: '(app) PrivacyGate',
    path: '/',
    states: [
      { state: 'review', ...gate(privacyMe()), main: true },
      {
        state: 'updated',
        ...gate(
          privacyMe({
            decided: true,
            noticeVersion: 1,
            choices: { presence: true, faceCameras: false, voiceLearning: true, cameraAudio: false },
          })
        ),
      },
      {
        state: 'household-off-signal',
        ...gate(privacyMe({ household: { presence: true, faceCameras: false, voiceLearning: true, cameraAudio: false } })),
      },
      {
        state: 'surveillance-off',
        ...gate(privacyMe()),
        context: { modules: ownerContext({ surveillance: false }).modules },
        notes: 'Surveillance off: only the core signal is asked',
      },
      {
        state: 'notice-dialog',
        ...gate(privacyMe()),
        act: async (scene) => {
          await tapText(scene, 'screens.privacy.consent.read-notice');
        },
      },
      {
        state: 'decline-confirm',
        ...gate(privacyMe()),
        act: async (scene) => {
          await tapText(scene, 'screens.privacy.consent.decline');
        },
      },
      {
        state: 'accept-failed-toast',
        before: late('**/__api/privacy/me', 1500),
        routes: [
          { method: 'GET', path: '/privacy/me', info: privacyMe() },
          { method: 'PUT', path: '/privacy/me', status: 500, errors: { code: 'INTERNAL_ERROR', message: 'x' } },
        ],
        act: async (scene) => {
          await button(scene, 'screens.privacy.consent.accept').first().click();
          await sleep(900);
        },
      },
    ],
  },
  {
    screen: 'not-found',
    route: '/+not-found',
    path: '/no-existe',
    states: [
      { state: 'signed-in', main: true },
      { state: 'unpaired', seed: unpairedDevice('A') },
    ],
  },
  {
    screen: 'entry-gate',
    route: '(app) EntryGate',
    path: '/security',
    states: [
      {
        state: 'context-pending-splash',
        before: async (context) => {
          await context.routeWebSocket(/__sync/, (socket) => socket.close());
        },
        notes: 'socket refused: a module route waits for the context behind the splash (up to 3 s), then falls back',
      },
    ],
  },
];
