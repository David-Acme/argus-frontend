import type { BrowserContext } from 'playwright-core';
import type { RouteSpec } from '../support/fake-argus';
import { ownerContext } from '../support/fake-argus';
import { emit } from '../support/harness';
import { sleep, type Scene } from '../support/ui-map/capture';
import {
  AGRONOMY_MODULE,
  BASELINE,
  CALL_PREFERENCES,
  CAMERAS,
  CORE_MODULE,
  GUARD_CAMERAS,
  PEOPLE,
  PRIVACY_DECIDED,
  PRODUCTIVITY_MODULE,
  PROXIMITY_PEOPLE,
  RECEIVERS,
  SAFETY,
  SENSORS,
  SESSIONS,
  SURVEILLANCE_MODULE,
  VISITOR_DETAIL,
  catalogContext,
  job,
  sessionRow,
} from '../support/ui-map/backend';
import { DAY, HOUR, HOUSEHOLD, NOW, reminder, user } from '../support/ui-map/data';
import type { Row, ScreenSpec } from '../support/ui-map/scenario';
import { button, say } from '../support/ui-map/text';
import type { TranslationKey } from '../../../src/core/types';

const click =
  (key: TranslationKey, which: 'first' | 'last' = 'first', params?: Record<string, string>) =>
  async (scene: Scene): Promise<void> => {
    const locator = button(scene, key, params);
    await (which === 'first' ? locator.first() : locator.last()).click({ timeout: 8000 });
    await sleep(900);
  };

const clickName =
  (name: RegExp) =>
  async (scene: Scene): Promise<void> => {
    await scene.page.getByRole('button', { name }).first().click({ timeout: 8000 });
    await sleep(900);
  };

const clickText =
  (key: TranslationKey, which: 'first' | 'last' = 'first', params?: Record<string, string>) =>
  async (scene: Scene): Promise<void> => {
    const locator = scene.page.getByText(say(scene, key, params), { exact: true });
    await (which === 'first' ? locator.first() : locator.last()).click({ timeout: 8000 });
    await sleep(900);
  };

const fill =
  (key: TranslationKey, value: string) =>
  async (scene: Scene): Promise<void> => {
    await scene.page.getByPlaceholder(say(scene, key)).first().fill(value);
    await sleep(900);
  };

const tabChip =
  (key: TranslationKey) =>
  async (scene: Scene): Promise<void> => {
    await scene.page
      .getByRole('checkbox', { name: say(scene, key), exact: true })
      .first()
      .click({ timeout: 8000 });
    await sleep(900);
  };

const toggle =
  (name: string) =>
  async (scene: Scene): Promise<void> => {
    await scene.page.getByRole('switch', { name, exact: true }).first().click({ timeout: 8000 });
    await sleep(1200);
  };

const steps =
  (...actions: ((scene: Scene, baseUrl: string) => Promise<void>)[]) =>
  async (scene: Scene, baseUrl: string): Promise<void> => {
    for (const action of actions) await action(scene, baseUrl);
  };

const hold =
  (pattern: string) =>
  async (context: BrowserContext): Promise<void> => {
    await context.route(pattern, () => undefined);
  };

const setting = (
  key: string,
  group: string,
  type: string,
  level: string,
  value: string,
  patch: Record<string, unknown> = {}
) => ({
  key,
  group,
  type,
  level,
  apply: 'live',
  min: 0,
  max: 0,
  step: 0,
  choices: [],
  value,
  fallback: value,
  ...patch,
});

const SETTINGS = {
  owners: [
    {
      service: 'tts',
      reachable: true,
      configured: true,
      configFile: '/etc/argus/tts.toml',
      settings: [
        setting('tts.engine_es', 'voice', 'choice', 'basic', 'pocket', {
          choices: ['pocket', 'supertonic'],
          choiceStates: [
            { choice: 'pocket', availability: 'installed', sizeMb: 180, hostCommand: '' },
            { choice: 'supertonic', availability: 'installable', sizeMb: 320, hostCommand: '' },
          ],
        }),
        setting('tts.speed', 'synthesis', 'decimal', 'basic', '1.2', {
          min: 0.5,
          max: 2,
          step: 0.1,
          fallback: '1',
          unit: 'x',
        }),
        setting('tts.threads', 'synthesis', 'integer', 'advanced', '256', {
          min: 16,
          max: 4096,
          step: 16,
          apply: 'restart',
          pendingRestart: true,
        }),
      ],
    },
    {
      service: 'llm',
      reachable: true,
      configured: true,
      configFile: '/etc/argus/llm.toml',
      capabilities: ['gpu'],
      settings: [
        setting('llm.temperature', 'generation', 'decimal', 'basic', '0.3', {
          min: 0,
          max: 1,
          step: 0.05,
          fallback: '0.3',
        }),
        setting('llm.context_size', 'generation', 'choice', 'advanced', '4096', {
          choices: ['2048', '4096', '8192', '16384', '32768'],
          apply: 'restart',
        }),
        setting('llm.gpu_layers', 'hardware', 'integer', 'advanced', '0', {
          min: 0,
          max: 99,
          step: 1,
        }),
      ],
    },
    { service: 'stt', reachable: false, configured: true, settings: [] },
    { service: 'camera', reachable: true, configured: false, settings: [] },
    {
      service: 'guard',
      reachable: true,
      configured: true,
      settings: [
        setting('guard.app_siren_enabled', 'siren', 'toggle', 'basic', 'true'),
        setting('guard.siren_seconds', 'summary', 'integer', 'basic', '8', {
          min: 0,
          max: 23,
          step: 1,
        }),
      ],
    },
  ],
};

const rule = (profile: string, minCores: number, minRamGb: number) => ({
  profile,
  minCores,
  minRamGb,
  vectorIsa: false,
});

const PROFILES = {
  profiles: ['performance', 'balanced', 'quality'].map((id, index) => ({
    id,
    labelKey: id,
    current: id === 'balanced',
    owners: [
      {
        service: 'tts',
        reachable: true,
        changes: [
          {
            key: 'tts.engine_es',
            from: 'pocket',
            to: index === 2 ? 'supertonic' : 'pocket',
            changed: index === 2,
            install:
              index === 2
                ? { availability: 'installable', sizeMb: 320, hostCommand: '' }
                : undefined,
          },
        ],
      },
      { service: 'stt', reachable: false, changes: [] },
    ],
  })),
  recommendation: {
    profile: 'balanced',
    reason: 'meets',
    hardware: { cores: 8, threads: 16, ramGb: 32, isa: 'avx2', gpu: 'none' },
    rule: rule('balanced', 4, 8),
    missed: rule('quality', 12, 32),
    rules: [rule('performance', 2, 4), rule('balanced', 4, 8), rule('quality', 12, 32)],
    fallback: 'performance',
  },
  firstRun: {
    profile: 'balanced',
    state: 'applied',
    appliedAt: NOW - DAY,
    owners: [{ service: 'tts', keys: ['tts.engine_es', 'tts.speed'] }],
  },
};

export const SETTINGS_ROUTES: RouteSpec[] = [
  { method: 'GET', path: '/settings', info: SETTINGS },
  { method: 'GET', path: '/settings/profiles', info: PROFILES },
];

const HOUSEHOLD_ROUTES: RouteSpec[] = [
  ...BASELINE,
  ...SETTINGS_ROUTES,
  { method: 'GET', path: '/guard/proximity/receivers', info: RECEIVERS },
  { method: 'GET', path: '/guard/proximity/sensors', info: SENSORS },
  { method: 'GET', path: '/guard/proximity/people', info: PROXIMITY_PEOPLE },
  { method: 'GET', path: '/guard/cameras', info: GUARD_CAMERAS },
  { method: 'GET', path: '/visitor/3', info: VISITOR_DETAIL },
  {
    method: 'GET',
    path: '/auth/users/2/sessions',
    info: { sessions: [sessionRow('e'.repeat(32), 'Moto G', 'android', false, NOW - 60)] },
  },
  { method: 'GET', path: '/auth/users/8/sessions', info: { sessions: [] } },
];

const ROWS: Row[] = [...PEOPLE, ...CAMERAS];

const activity = (id: number, table: string, action: string, title: string, ago: number) => ({
  id,
  userId: 1,
  recordId: id,
  table,
  module: table === 'camera' ? 'surveillance' : 'productivity',
  action,
  oldData: null,
  newData: { title },
  ipAddress: '',
  createdAt: NOW - ago,
});

const MY_ACTIVITY = [
  activity(901, 'project_task', 'update', 'Sacar la basura', HOUR),
  activity(902, 'reminder', 'create', 'Pagar el agua', HOUR * 2),
  activity(903, 'calendar_event', 'create', 'Cena con Luis', DAY),
  activity(904, 'user_invitation', 'create', '', DAY + HOUR),
  activity(905, 'camera', 'read', 'Patio trasero', DAY * 2),
];

const WEEK: Row[] = [
  reminder(201, 'Sacar la basura', NOW - HOUR * 5, {
    isCompleted: true,
    completedAt: NOW - HOUR * 6,
  }),
  reminder(202, 'Pagar la luz', NOW - DAY, { isCompleted: true, completedAt: NOW - DAY - HOUR }),
  reminder(203, 'Llamar al gasfitero', NOW + HOUR * 4),
];

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

const IMPACT = {
  moduleId: 'surveillance',
  action: 'uninstall',
  allowed: true,
  refusal: null,
  stops: [
    { kind: 'live_views', count: 2 },
    { kind: 'recordings', count: 5 },
  ],
  keepsRunning: [],
  unreachable: [],
  roleMoves: [],
  roleHolders: [{ userId: 3, name: 'Carlos', lastName: 'Paredes', role: 'guard', isActive: true }],
  roleEffect: 'reassign_required',
  reassignRoles: ['resident', 'guest'],
  invitations: [{ id: 104, role: 'guard', createdBy: 1, createdByName: 'Ana', expiresAt: 0 }],
  data: [],
  filesBytes: 2048,
};

const MODULE_DATA = {
  owners: [
    {
      owner: 'camera',
      reachable: true,
      reported: true,
      items: [
        { kind: 'cameras', count: 5 },
        { kind: 'clips', count: 120 },
      ],
      bytes: 1048576,
    },
  ],
};

const tomorrowAt = (hour: number): number => {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  day.setHours(hour, 0, 0, 0);
  return Math.floor(day.getTime() / 1000);
};

const callFrame =
  (type: string, payload: Record<string, unknown>) =>
  async (_scene: Scene, baseUrl: string): Promise<void> => {
    await emit(baseUrl, [{ frame: { type, payload } }]);
    await sleep(800);
  };

function fakeMicrophone(): void {
  const devices = navigator.mediaDevices as MediaDevices | undefined;
  if (!devices) return;
  devices.getUserMedia = async () => new AudioContext().createMediaStreamDestination().stream;
}

const voiceGrant = {
  url: 'wss://argus.e2e/rtc',
  token: 't',
  room: 'r',
  identity: 'u1',
  agentIdentity: 'agent',
  callId: 'call-1',
  expiresAt: NOW + 600,
  iceServers: [],
};

export const HOUSEHOLD_SCREENS: ScreenSpec[] = [
  {
    screen: 'users',
    inApp: true,
    route: '/users',
    path: '/users',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      { state: 'only-owner', rows: [] },
      {
        state: 'many-long',
        rows: Array.from({ length: 24 }, (_, index) =>
          user(
            30 + index,
            index % 5 === 0 ? 'María Fernanda Guadalupe' : `Persona ${index}`,
            index % 5 === 0 ? 'de los Santos Villanueva Huamán' : 'Pérez',
            ['resident', 'guard', 'guest'][index % 3] as string,
            index % 7 !== 0
          )
        ),
      },
      {
        state: 'surveillance-off',
        context: { modules: ownerContext({ surveillance: false }).modules },
      },
      {
        state: 'panels-failed',
        routes: [
          {
            method: 'GET',
            path: '/privacy/users',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
          {
            method: 'GET',
            path: '/auth/users/sessions',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      { state: 'new-invitation-dialog', act: click('screens.users.new-invitation') },
      {
        state: 'invitation-qr',
        routes: [
          {
            method: 'POST',
            path: '/invitation',
            status: 201,
            info: {
              id: 106,
              token: 'a'.repeat(40),
              role: 'resident',
              maxRedemptions: 1,
              redemptionCount: 0,
              expiresAt: NOW + 900,
              createdBy: 1,
              revokedAt: null,
              createdAt: NOW,
            },
          },
          { method: 'DELETE', path: '/invitation/106', info: null },
        ],
        act: steps(click('screens.users.new-invitation'), click('screens.users.show-qr', 'last')),
      },
      { state: 'edit-user-dialog', act: clickName(/^(Editar|Edit) Luis/) },
      {
        state: 'user-access-dialog',
        act: click('screens.users.access-of', 'first', { name: 'Luis Ruiz' }),
      },
      {
        state: 'user-access-dialog-inactive',
        act: click('screens.users.access-of', 'first', { name: 'Jorge Quispe' }),
      },
      {
        state: 'role-guard-paused',
        context: { modules: ownerContext({ surveillance: false }).modules },
        act: clickName(/^(Editar|Edit) Carlos/),
      },
    ],
  },
  {
    screen: 'people-directory',
    inApp: true,
    route: '/people',
    path: '/people',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'guard-populated', role: 'guard', main: true },
      {
        state: 'guard-filter-no-match',
        role: 'guard',
        act: async (scene) => {
          await scene.page.getByRole('textbox').first().fill('zzz');
          await sleep(600);
        },
      },
      { state: 'guard-person-dialog', role: 'guard', act: clickName(/^Luis Ruiz\./) },
      { state: 'owner-redirect', notes: 'an Owner opening /people is sent to /profile' },
    ],
  },
  {
    screen: 'visitors',
    inApp: true,
    route: '/users/visitors',
    path: '/users/visitors',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      {
        state: 'empty',
        routes: [
          {
            method: 'GET',
            path: '/visitor',
            info: { recognitionEnabled: true, visitors: [], nextCursor: null },
          },
        ],
      },
      {
        state: 'recognition-off',
        routes: [
          {
            method: 'GET',
            path: '/visitor',
            info: { recognitionEnabled: false, visitors: [], nextCursor: null },
          },
          {
            method: 'GET',
            path: '/visitor-settings',
            info: {
              recognitionEnabled: false,
              unnamedRetentionDays: 30,
              minRetentionDays: 1,
              maxRetentionDays: 60,
              updatedAt: NOW,
            },
          },
        ],
      },
      { state: 'merge-mode', act: click('screens.visitors.merge-mode') },
    ],
  },
  {
    screen: 'visitor-detail',
    inApp: true,
    route: '/users/visitors/[id]',
    path: '/users/visitors/3',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      { state: 'missing', path: '/users/visitors/77' },
      { state: 'loading', before: hold('**/__api/visitor/3') },
    ],
  },
  {
    screen: 'proximity',
    inApp: true,
    route: '/settings/proximity',
    path: '/settings/proximity',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      {
        state: 'empty',
        routes: [
          { method: 'GET', path: '/guard/proximity/receivers', info: { receivers: [] } },
          { method: 'GET', path: '/guard/proximity/sensors', info: { sensors: [] } },
        ],
      },
      {
        state: 'failed',
        routes: [
          {
            method: 'GET',
            path: '/guard/proximity/receivers',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      {
        state: 'receiver-dialog-errors',
        act: async (scene) => {
          await click('screens.proximity.receivers.add')(scene);
          await button(scene, 'screens.proximity.receivers.add').last().click();
          await sleep(700);
        },
      },
      { state: 'radar-dialog', act: click('screens.proximity.sensors.add') },
    ],
  },
  {
    screen: 'proximity-people',
    inApp: true,
    route: '/settings/proximity/people',
    path: '/settings/proximity/people',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      {
        state: 'empty',
        routes: [{ method: 'GET', path: '/guard/proximity/people', info: { people: [] } }],
      },
    ],
  },
  {
    screen: 'settings',
    inApp: true,
    route: '/settings',
    path: '/settings',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'hub', main: true },
      { state: 'service-tts', path: '/settings/tts' },
      { state: 'service-unreachable', path: '/settings/stt' },
      { state: 'search', act: fill('screens.settings.hub.search', 'velocidad') },
      {
        state: 'advanced-open',
        path: '/settings/llm',
        act: clickText('screens.settings.advanced.count', 'first', { count: '2' }),
      },
      {
        state: 'setting-sheet',
        path: '/settings/llm',
        act: steps(
          clickText('screens.settings.advanced.count', 'first', { count: '2' }),
          async (scene) => {
            await scene.page.getByText('llm.gpu_layers').first().click({ timeout: 8000 });
            await sleep(900);
          }
        ),
      },
      {
        state: 'more-menu',
        path: '/settings/tts',
        act: async (scene) => {
          await scene.page.getByLabel(say(scene, 'screens.settings.more.label')).first().click();
          await sleep(900);
        },
      },
      {
        state: 'failed',
        routes: [
          {
            method: 'GET',
            path: '/settings',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
          {
            method: 'GET',
            path: '/settings/profiles',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      {
        state: 'empty-owners',
        rows: [],
        routes: [{ method: 'GET', path: '/settings', info: { owners: [] } }],
      },
    ],
  },
  {
    screen: 'modules',
    inApp: true,
    route: '/settings/modules',
    path: '/settings/modules',
    routes: [
      ...HOUSEHOLD_ROUTES,
      { method: 'GET', path: '/modules/surveillance/impact?action=uninstall', info: IMPACT },
      {
        method: 'GET',
        path: '/modules/surveillance/impact?action=disable',
        info: { ...IMPACT, action: 'disable', roleEffect: 'inactive' },
      },
      { method: 'GET', path: '/modules/surveillance/data', info: MODULE_DATA },
    ],
    rows: ROWS,
    states: [
      { state: 'populated', main: true, context: catalog({}) },
      { state: 'brief-catalog-only', notes: 'no ownerCatalog: sizes and hardware are missing' },
      { state: 'waiting-for-server', context: { modules: [], ownerCatalog: null } },
      {
        state: 'installing',
        context: catalog({
          enabled: false,
          lifecycle: 'not_installed',
          installedBytes: 0,
          job: job('install', 'downloading', 0.42),
        }),
      },
      {
        state: 'install-failed',
        context: catalog({
          enabled: false,
          lifecycle: 'not_installed',
          installedBytes: 0,
          job: job('install', 'failed', 0.7, { reason: 'disk_full' }),
        }),
      },
      {
        state: 'disabled-and-kept',
        context: catalog(
          { enabled: false, lifecycle: 'disabled' },
          { enabled: false, lifecycle: 'uninstalled_data_kept', installedBytes: 0 }
        ),
      },
      { state: 'disable-dialog', context: catalog({}), act: toggle('Vigilancia') },
      {
        state: 'uninstall-dialog',
        context: catalog({}),
        act: clickText('screens.modules.actions.uninstall'),
      },
    ],
  },
  {
    screen: 'profile',
    inApp: true,
    route: '/profile',
    path: '/profile',
    routes: HOUSEHOLD_ROUTES,
    rows: [],
    states: [
      {
        state: 'owner',
        main: true,
        rows: [...ROWS, ...WEEK],
        routes: [
          { method: 'GET', path: '/sync/activity', info: { items: MY_ACTIVITY, nextCursor: null } },
        ],
      },
      {
        state: 'empty',
        routes: [
          { method: 'GET', path: '/auth/sessions', info: { sessions: SESSIONS.slice(0, 1) } },
          {
            method: 'GET',
            path: '/guard/presence',
            info: { people: [{ userId: 1, state: 'home', since: NOW - 3600, environments: [] }] },
          },
        ],
      },
      { state: 'tab-account', rows: ROWS, act: tabChip('screens.profile.tabs.account') },
      { state: 'tab-argus', rows: ROWS, act: tabChip('screens.profile.tabs.argus') },
      { state: 'resident', role: 'resident', rows: ROWS },
      { state: 'guard', role: 'guard', rows: ROWS },
      { state: 'guest', role: 'guest', rows: ROWS },
      { state: 'inactive', role: 'inactive', rows: ROWS },
      { state: 'unknown-role', role: 'unknown', rows: ROWS },
      {
        state: 'sessions-failed',
        rows: ROWS,
        routes: [
          {
            method: 'GET',
            path: '/auth/sessions',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
    ],
  },
  {
    screen: 'profile-sessions',
    inApp: true,
    route: '/profile/sessions',
    path: '/profile/sessions',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      {
        state: 'only-session',
        routes: [
          { method: 'GET', path: '/auth/sessions', info: { sessions: SESSIONS.slice(0, 1) } },
        ],
      },
      {
        state: 'failed',
        routes: [
          {
            method: 'GET',
            path: '/auth/sessions',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      { state: 'sign-out-all-confirm', act: clickText('screens.sessions.sign-out-everywhere') },
      { state: 'unpair-confirm', act: clickText('screens.sessions.home.unpair') },
    ],
  },
  {
    screen: 'profile-privacy',
    inApp: true,
    route: '/profile/privacy',
    path: '/profile/privacy',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'decided', main: true },
      {
        state: 'household-off',
        routes: [
          {
            method: 'GET',
            path: '/privacy/me',
            info: {
              ...PRIVACY_DECIDED,
              household: { ...PRIVACY_DECIDED.household, cameraAudio: false },
            },
          },
        ],
      },
      {
        state: 'failed',
        routes: [
          {
            method: 'GET',
            path: '/privacy/me',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      { state: 'notice-dialog', act: clickText('screens.privacy.section.terms-title') },
    ],
  },
  {
    screen: 'profile-calls',
    inApp: true,
    route: '/profile/calls',
    path: '/profile/calls',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'on', main: true },
      {
        state: 'off',
        routes: [
          {
            method: 'GET',
            path: '/notification/call-preferences',
            info: { ...CALL_PREFERENCES, enabled: false },
          },
        ],
      },
      {
        state: 'failed',
        routes: [
          {
            method: 'GET',
            path: '/notification/call-preferences',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
    ],
  },
  {
    screen: 'profile-appearance',
    inApp: true,
    route: '/profile/appearance',
    path: '/profile/appearance',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'system', main: true },
      {
        state: 'theme-dark-selected',
        act: async (scene) => {
          await scene.page
            .getByRole('radio', { name: say(scene, 'screens.profile.theme.dark'), exact: true })
            .first()
            .click();
          await sleep(800);
        },
      },
    ],
  },
  {
    screen: 'profile-safety',
    inApp: true,
    route: '/profile/safety',
    path: '/profile/safety',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'populated', main: true },
      {
        state: 'pin-setup-dialog',
        routes: [
          {
            method: 'GET',
            path: '/guard/safety',
            info: { ...SAFETY, hasPin: false },
          },
        ],
        act: clickText('screens.safety.pins.create'),
      },
    ],
  },
  {
    screen: 'profile-modules',
    inApp: true,
    route: '/profile/modules',
    path: '/profile/modules',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      {
        state: 'module-request-resident',
        main: true,
        role: 'resident',
        context: { modules: ownerContext({ surveillance: false }).modules },
      },
    ],
  },
  {
    screen: 'call',
    inApp: true,
    route: '/call',
    path: '/call',
    routes: HOUSEHOLD_ROUTES,
    rows: [...HOUSEHOLD, ...CAMERAS],
    states: [
      {
        state: 'mic-denied-error',
        main: true,
        notes: 'no /rtc/token: legacy socket path; headless Chromium denies the microphone',
      },
      {
        state: 'connecting-rtc',
        routes: [{ method: 'POST', path: '/rtc/token', info: voiceGrant }],
        notes: 'the shim answers argus_rtc_join with null: the call stays connecting',
      },
      {
        state: 'listening-transcript',
        before: async (context) => {
          await context.addInitScript(fakeMicrophone);
        },
        act: steps(
          async () => {
            await sleep(1500);
          },
          callFrame('voice:stt', { text: '¿Quién está en la puerta?', final: true }),
          callFrame('voice:assistant', {
            text: 'Es el técnico de internet. Llegó hace dos minutos y espera en la reja.',
          }),
          callFrame('voice:action', {
            id: 1,
            name: 'app.show_camera',
            arguments: { camera: 'Patio trasero' },
          })
        ),
      },
      {
        state: 'result-reminder-offer',
        before: async (context) => {
          await context.addInitScript(fakeMicrophone);
        },
        act: steps(
          async () => {
            await sleep(1500);
          },
          callFrame('voice:stt', { text: 'Mañana tengo que pagar el agua', final: true }),
          callFrame('voice:assistant', { text: '¿Te lo recuerdo mañana a las 9:00?' }),
          callFrame('voice:result', {
            id: 11,
            tool: 'memory.remind',
            ok: true,
            data: { title: 'Pagar el agua', remindAt: tomorrowAt(9), confirm: true },
          })
        ),
        notes:
          'voice:result is the assumed result frame (P5 adapter); the offer is answered aloud in the call',
      },
      {
        state: 'result-agenda-list',
        before: async (context) => {
          await context.addInitScript(fakeMicrophone);
        },
        act: steps(
          async () => {
            await sleep(1500);
          },
          callFrame('voice:stt', { text: '¿Qué tengo mañana?', final: true }),
          callFrame('voice:assistant', {
            text: 'Mañana tienes tres cosas. La primera es a las 9.',
          }),
          callFrame('voice:result', {
            id: 12,
            tool: 'calendar.list_events',
            ok: true,
            data: {
              day: tomorrowAt(0),
              items: [
                { id: 1, title: 'Pagar el agua', startsAt: tomorrowAt(9), kind: 'reminder' },
                { id: 2, title: 'Técnico de internet', startsAt: tomorrowAt(14), kind: 'event' },
                { id: 3, title: 'Cena con Luis', startsAt: tomorrowAt(20), kind: 'event' },
              ],
            },
          })
        ),
      },
      {
        state: 'done',
        before: async (context) => {
          await context.addInitScript(fakeMicrophone);
        },
        act: steps(
          async () => {
            await sleep(1500);
          },
          callFrame('voice:done', {})
        ),
      },
      {
        state: 'call-unavailable',
        path: '/call?callId=call-7',
        routes: [
          {
            method: 'POST',
            path: '/rtc/token',
            status: 503,
            errors: { code: 'RTC_UNAVAILABLE', message: 'x' },
          },
        ],
      },
      {
        state: 'minimised',
        before: async (context) => {
          await context.addInitScript(fakeMicrophone);
        },
        act: steps(async () => {
          await sleep(1500);
        }, click('screens.voice.stage.minimise')),
      },
    ],
  },
];
