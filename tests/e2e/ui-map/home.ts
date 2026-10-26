import { ownerContext } from '../support/fake-argus';
import { control, emit } from '../support/harness';
import { ownerDevice } from '../support/seed';
import type { ShimSeed } from '../support/tauri-shim';
import { sleep, type Scene } from '../support/ui-map/capture';
import {
  AGRONOMY_MODULE,
  BASELINE,
  CAMERAS,
  CORE_MODULE,
  EMPTY_OVERVIEW,
  INCIDENT,
  NOTIFICATIONS,
  PRODUCTIVITY_MODULE,
  SURVEILLANCE_MODULE,
  catalogContext,
  job,
  notification,
} from '../support/ui-map/backend';
import {
  HOUR,
  LONG_TEXT,
  MIDNIGHT,
  NOW,
  PRODUCTIVITY,
  project,
  reminder,
  user,
} from '../support/ui-map/data';
import type { Row, ScreenSpec } from '../support/ui-map/scenario';
import { button, say, text } from '../support/ui-map/text';

const POPULATED: Row[] = [
  ...PRODUCTIVITY,
  ...CAMERAS,
  ...NOTIFICATIONS,
  reminder(952, 'Llamar al plomero', MIDNIGHT + HOUR * 11),
];

const respond = (patch: Record<string, unknown>) => [
  { method: 'GET', path: '/notification/responses', info: [{ ...INCIDENT, ...patch }] },
];

const remote = (cut: Record<string, string>): ShimSeed => {
  const base = ownerDevice('A');
  return {
    device: 'A',
    secure: {
      ...base.secure,
      'net.remoteHomeId': '0123456789abcdef0123456789abcdef',
      'net.remoteDomain': 'argus-tunnel.lynk.page',
    },
    local: { ...base.local, __e2e_unreachable__: JSON.stringify(cut) },
  };
};

const offline =
  (wait: number) =>
  async (scene: Scene, baseUrl: string): Promise<void> => {
    await control(baseUrl, 'refuse?device=A&ms=900000');
    await control(baseUrl, 'drop?device=A');
    await sleep(wait);
  };

const incoming =
  (urgency: string) =>
  async (_scene: Scene, baseUrl: string): Promise<void> => {
    await emit(baseUrl, [
      {
        frame: {
          operation: 8,
          option: 'call',
          info: {
            callId: 'call-42',
            reason: 'Hay alguien en la puerta trasera',
            summary: '',
            urgency,
            kind: 'guard_episode',
            expiresAt: NOW + 3600,
          },
        },
      },
    ]);
    await sleep(1200);
  };

const manyProjects: Row[] = Array.from({ length: 14 }, (_, index) =>
  project(
    1000 + index,
    index % 3 === 0 ? `${LONG_TEXT.slice(0, 40 + index)}` : `Proyecto ${index + 1}`,
    {
      description: index % 2 === 0 ? LONG_TEXT : '',
    }
  )
);

const manyNotifications: Row[] = Array.from({ length: 46 }, (_, index) =>
  notification(
    200 + index,
    `Aviso número ${index + 1} con un título bastante largo para ver cómo se corta`,
    LONG_TEXT,
    { kind: 'system', urgency: 'passive' }
  )
);

const manyReminders: Row[] = Array.from({ length: 12 }, (_, index) =>
  reminder(
    1100 + index,
    index % 4 === 0 ? LONG_TEXT : `Recordatorio ${index + 1}`,
    NOW + (index - 4) * HOUR * 3,
    {
      recurrenceRule: index % 5 === 0 ? 'FREQ=WEEKLY' : null,
    }
  )
);

const watchConversation = {
  conversationId: 'w1',
  cameraId: 3,
  cameraName: 'Patio trasero',
  state: 'listening',
  handoff: 'camera',
  audience: 'member',
  startedAt: NOW - 60,
  updatedAt: NOW - 5,
  resumableUntil: null,
  endReason: null,
  turns: [
    { id: 't1', role: 'user', text: 'Argus, ¿quién está en la puerta?', at: NOW - 30, final: true },
  ],
};

const catalog = (
  surveillance: Record<string, unknown>,
  productivity: Record<string, unknown> = {}
) =>
  catalogContext([
    CORE_MODULE,
    { ...SURVEILLANCE_MODULE, ...surveillance },
    { ...PRODUCTIVITY_MODULE, ...productivity },
    AGRONOMY_MODULE,
  ]);

const hover =
  (key: Parameters<typeof say>[1]) =>
  async (scene: Scene): Promise<void> => {
    await scene.page
      .getByRole('button', { name: say(scene, key), exact: true })
      .first()
      .hover();
    await sleep(500);
  };

const search =
  (value: string) =>
  async (scene: Scene): Promise<void> => {
    await button(scene, 'screens.home.inicio.search').first().click();
    await sleep(500);
    await scene.page.getByRole('textbox').first().fill(value);
    await sleep(700);
  };

export const HOME: ScreenSpec[] = [
  {
    screen: 'home',
    route: '/',
    path: '/',
    routes: BASELINE,
    states: [
      { state: 'populated', rows: POPULATED, routes: respond({}), main: true },
      {
        state: 'populated-fast-server',
        rows: POPULATED,
        routes: respond({}),
        latency: 0,
        notes:
          'the same data answered with no latency: remote resources answered during session start are dropped (0 detections, no alert card)',
      },
      {
        state: 'empty-new-household',
        routes: [
          { method: 'GET', path: '/guard/environments', info: [] },
          { method: 'GET', path: '/camera/overview', info: EMPTY_OVERVIEW },
        ],
      },
      {
        state: 'many-long',
        rows: [
          ...POPULATED,
          ...manyProjects,
          ...manyNotifications,
          ...manyReminders,
          user(1, 'Ana María Alejandra', 'Ruiz de la Fuente', 'owner'),
        ],
        notes: '14 projects, 46 notifications, 12 reminders, long titles and a long first name',
      },
      {
        state: 'before-context',
        rows: POPULATED,
        before: async (context) => {
          await context.routeWebSocket(/__sync/, (socket) => socket.close());
        },
        notes: 'socket refused: only the core capabilities are known (no context yet)',
      },
      {
        state: 'offline-toast',
        rows: POPULATED,
        act: offline(13200),
        notes: 'socket dropped and refused for 15 min; the warning toast',
      },
      {
        state: 'offline-icon',
        rows: POPULATED,
        act: offline(21000),
        notes: 'after the toast closes, the wifi-off icon stays in the top bar',
      },
      {
        state: 'route-unreachable',
        rows: POPULATED,
        seed: remote({ 'argus.e2e': 'connect', 'argus-tunnel.lynk.page': 'tls-peer-closed' }),
        act: async () => {
          await sleep(14000);
        },
      },
      {
        state: 'route-remote-unavailable',
        rows: POPULATED,
        seed: remote({ 'argus.e2e': 'connect', 'argus-tunnel.lynk.page': 'connect' }),
        act: async () => {
          await sleep(14000);
        },
      },
      { state: 'search-no-match', rows: POPULATED, act: search('zzzz') },
      { state: 'search-match', rows: POPULATED, act: search('Mudanza') },
      {
        state: 'response-unanswered-contacts',
        rows: POPULATED,
        routes: respond({
          state: 'unanswered',
          showContacts: true,
          contacts: [
            { name: 'Vecina del 2B', phone: '+51999111222', note: 'Tiene llave' },
            { name: 'Serenazgo', phone: '+5114441111', note: '' },
          ],
        }),
      },
      {
        state: 'response-attended-discreet',
        rows: POPULATED,
        routes: respond({
          state: 'attended',
          attendedBy: { userId: 3, name: 'Carlos' },
          mine: { ...INCIDENT.mine, discreet: true },
        }),
      },
      {
        state: 'response-confirmed-panic',
        rows: POPULATED,
        routes: respond({
          kind: 'guard_panic',
          state: 'confirmed',
          verdict: 'real',
          verdictBy: { userId: 1, name: 'Ana' },
        }),
      },
      {
        state: 'response-false-alarm-confirm',
        rows: POPULATED,
        routes: respond({}),
        act: async (scene) => {
          await scene.page
            .getByText(say(scene, 'screens.response.false-alarm'), { exact: true })
            .first()
            .click();
          await sleep(700);
        },
      },
      { state: 'incoming-call', rows: POPULATED, act: incoming('active') },
      { state: 'incoming-call-critical', rows: POPULATED, act: incoming('critical') },
      {
        state: 'watch-pill',
        rows: POPULATED,
        routes: [
          { method: 'GET', path: '/rtc/watch', info: { conversations: [watchConversation] } },
        ],
      },
      {
        state: 'module-installing-chip',
        rows: POPULATED,
        context: catalog({
          enabled: false,
          lifecycle: 'not_installed',
          installedBytes: 0,
          job: job('install', 'downloading', 0.42),
        }),
      },
      {
        state: 'module-failed-chip',
        rows: POPULATED,
        context: catalog({
          enabled: false,
          lifecycle: 'not_installed',
          installedBytes: 0,
          job: job('install', 'failed', 0.7, { reason: 'disk_full' }),
        }),
      },
      {
        state: 'getting-started',
        rows: POPULATED,
        context: catalog({
          gettingStarted: [
            {
              id: 'add-camera',
              title: 'Conecta tu primera cámara',
              hint: 'Desde Cámaras',
              route: '/cameras',
            },
            {
              id: 'zones',
              title: 'Dibuja una zona de alerta',
              hint: 'En el detalle de la cámara',
              route: '/cameras',
            },
            {
              id: 'mode',
              title: 'Elige el modo de seguridad',
              hint: 'En Seguridad',
              route: '/security',
            },
          ],
        }),
      },
      {
        state: 'all-modules-off',
        rows: POPULATED,
        context: {
          ...catalog(
            { enabled: false, lifecycle: 'disabled' },
            { enabled: false, lifecycle: 'disabled' }
          ),
        },
        notes: 'Surveillance and Productivity off: the getting-started card asks to choose modules',
      },
      {
        state: 'productivity-off',
        rows: POPULATED,
        context: { modules: ownerContext({ productivity: false }).modules },
      },
      {
        state: 'surveillance-off',
        rows: POPULATED,
        context: { modules: ownerContext({ surveillance: false }).modules },
      },
      { state: 'resident', role: 'resident', rows: POPULATED },
      { state: 'guard', role: 'guard', rows: POPULATED, routes: respond({}) },
      { state: 'guest', role: 'guest', rows: POPULATED },
      {
        state: 'nav-tooltip',
        rows: POPULATED,
        act: hover('screens.projects.title'),
        notes: 'pointer over a rail tab (rail only from 640 px)',
      },
      {
        state: 'reminders-done-open',
        rows: [
          ...POPULATED,
          reminder(960, 'Sacar la basura', NOW - HOUR * 2),
          reminder(961, 'Tomar la pastilla', NOW + HOUR, { recurrenceRule: 'FREQ=DAILY' }),
        ],
        act: async (scene) => {
          await text(scene, 'screens.reminders.show-done').first().click();
          await sleep(500);
        },
      },
      {
        state: 'reminder-snooze-menu',
        rows: [...POPULATED, reminder(960, 'Sacar la basura', NOW - HOUR * 2)],
        act: async (scene) => {
          await button(scene, 'screens.reminders.snooze-label', { title: 'Sacar la basura' })
            .first()
            .click();
          await sleep(700);
        },
      },
      {
        state: 'reminder-options-menu',
        rows: [
          ...POPULATED,
          reminder(961, 'Tomar la pastilla', NOW + HOUR, { recurrenceRule: 'FREQ=DAILY' }),
        ],
        act: async (scene) => {
          await button(scene, 'screens.reminders.options').first().click();
          await sleep(700);
        },
      },
      {
        state: 'reminder-dialog',
        rows: [
          ...POPULATED,
          reminder(961, 'Tomar la pastilla', NOW + HOUR, {
            recurrenceRule: 'FREQ=DAILY',
            description: 'Con el desayuno',
          }),
        ],
        act: async (scene) => {
          await scene.page
            .getByRole('button', { name: /^Tomar la pastilla\./ })
            .first()
            .click();
          await sleep(900);
        },
      },
      {
        state: 'reminder-dialog-errors',
        rows: [...POPULATED, reminder(961, 'Tomar la pastilla', NOW + HOUR)],
        act: async (scene) => {
          await scene.page
            .getByRole('button', { name: /^Tomar la pastilla\./ })
            .first()
            .click();
          await sleep(900);
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.reminders.title-field') })
            .fill('');
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.reminders.time') })
            .fill('9:3');
          await button(scene, 'common.save').last().click();
          await sleep(700);
        },
      },
    ],
  },
  {
    screen: 'inactive-role',
    route: '/ (roleActive false)',
    path: '/',
    routes: BASELINE,
    states: [
      { state: 'module-guard', role: 'inactive', main: true, routes: respond({}) },
      {
        state: 'module-already-asked',
        role: 'inactive',
        local: {
          'argus-storage:app.modules.requested.3': JSON.stringify({ surveillance: '2026-10-12' }),
        },
      },
      {
        state: 'paused-resident',
        role: 'inactive',
        context: { role: 'resident', roles: [] },
      },
      { state: 'unknown-role', role: 'unknown' },
      {
        state: 'sign-out-confirm',
        role: 'inactive',
        act: async (scene) => {
          await scene.page
            .getByRole('button', {
              name: say(scene, 'screens.access.inactive.sign-out'),
              exact: true,
            })
            .first()
            .click();
          await sleep(700);
        },
      },
    ],
  },
  {
    screen: 'notification-link',
    inApp: true,
    route: '/notification',
    path: '/notification?notificationId=999',
    routes: BASELINE,
    states: [
      {
        state: 'waiting-for-row',
        main: true,
        notes: 'the id is not in the first 40 synced notifications: it waits, possibly forever',
      },
    ],
  },
];
