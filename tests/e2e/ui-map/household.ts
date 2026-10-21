import type { BrowserContext } from 'playwright-core';
import type { RouteSpec } from '../support/fake-argus';
import { ownerContext } from '../support/fake-argus';
import { emit } from '../support/harness';
import { sleep, type Scene } from '../support/ui-map/capture';
import {
  AGRONOMY_MODULE,
  BASELINE,
  CAMERAS,
  CORE_MODULE,
  GUARD_CAMERAS,
  PEOPLE,
  PRIVACY_DECIDED,
  PRODUCTIVITY_MODULE,
  PROXIMITY_PEOPLE,
  RECEIVERS,
  SENSORS,
  SESSIONS,
  SURVEILLANCE_MODULE,
  VISITOR_DETAIL,
  catalogContext,
  job,
  sessionRow,
} from '../support/ui-map/backend';
import { DAY, HOUSEHOLD, NOW, user } from '../support/ui-map/data';
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
  (key: TranslationKey, which: 'first' | 'last' = 'first') =>
  async (scene: Scene): Promise<void> => {
    const locator = scene.page.getByText(say(scene, key), { exact: true });
    await (which === 'first' ? locator.first() : locator.last()).click({ timeout: 8000 });
    await sleep(900);
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
        setting('tts.cache_mb', 'synthesis', 'integer', 'advanced', '256', {
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
        setting('llm.context', 'generation', 'choice', 'advanced', '4096', {
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
        setting('guard.digest_hour', 'summary', 'integer', 'basic', '8', {
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

const HOUSEHOLD_ROUTES: RouteSpec[] = [
  ...BASELINE,
  { method: 'GET', path: '/settings', info: SETTINGS },
  { method: 'GET', path: '/settings/profiles', info: PROFILES },
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

const moduleAction =
  (action: TranslationKey, module: string) =>
  async (scene: Scene): Promise<void> => {
    const name = say(scene, 'screens.modules.action-of', { action: say(scene, action), module });
    await scene.page.getByRole('button', { name, exact: true }).first().click({ timeout: 8000 });
    await sleep(1200);
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
      { state: 'simple', main: true },
      { state: 'advanced', act: clickText('screens.settings.mode.advanced') },
      { state: 'advanced-mode-stored', local: { 'argus-storage:settings.mode': 'advanced' } },
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
        routes: [{ method: 'GET', path: '/settings', info: { owners: [] } }],
      },
      { state: 'profile-preview', act: clickName(/Equilibrado|Balanced/) },
      {
        state: 'export-dialog',
        local: { 'argus-storage:settings.mode': 'advanced' },
        act: click('screens.settings.transfer.export'),
      },
      {
        state: 'import-dialog-invalid',
        local: { 'argus-storage:settings.mode': 'advanced' },
        act: async (scene) => {
          await click('screens.settings.transfer.import')(scene);
          await scene.page.locator('textarea').first().fill('{ not json');
          await sleep(600);
        },
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
        state: 'paused-insufficient',
        context: catalog({
          enabled: false,
          lifecycle: 'not_installed',
          installedBytes: 0,
          job: job('install', 'paused', 0.3),
          hardware: {
            verdict: 'insufficient',
            reasons: ['ram_below_minimum', 'disk_insufficient'],
            minRamMb: 16384,
            recommendedRamMb: 32768,
            freeDiskMb: 512,
          },
        }),
      },
      {
        state: 'disabled-and-kept',
        context: catalog(
          { enabled: false, lifecycle: 'disabled' },
          { enabled: false, lifecycle: 'uninstalled_data_kept', installedBytes: 0 }
        ),
      },
      {
        state: 'disable-dialog',
        context: catalog({}),
        act: moduleAction('screens.modules.actions.disable', 'Vigilancia'),
      },
      {
        state: 'uninstall-dialog',
        context: catalog({}),
        act: moduleAction('screens.modules.actions.uninstall', 'Vigilancia'),
      },
      {
        state: 'uninstall-purge-typed',
        context: catalog({}),
        act: async (scene) => {
          await moduleAction('screens.modules.actions.uninstall', 'Vigilancia')(scene);
          await scene.page
            .getByRole('radio')
            .last()
            .click()
            .catch(() => undefined);
          await sleep(700);
        },
      },
    ],
  },
  {
    screen: 'profile',
    inApp: true,
    route: '/profile',
    path: '/profile',
    routes: HOUSEHOLD_ROUTES,
    rows: ROWS,
    states: [
      { state: 'owner', main: true },
      { state: 'resident', role: 'resident' },
      { state: 'guard', role: 'guard' },
      { state: 'guest', role: 'guest' },
      { state: 'inactive', role: 'inactive' },
      { state: 'unknown-role', role: 'unknown' },
      {
        state: 'panels-failed',
        routes: [
          {
            method: 'GET',
            path: '/auth/sessions',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
          {
            method: 'GET',
            path: '/notification/call-preferences',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
          {
            method: 'GET',
            path: '/privacy/me',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
          {
            method: 'GET',
            path: '/guard/safety',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      {
        state: 'loading',
        before: async (context) => {
          for (const path of [
            'auth/sessions',
            'notification/call-preferences',
            'privacy/me',
            'guard/safety',
            'guard/proximity/me',
          ]) {
            await hold(`**/__api/${path}`)(context);
          }
        },
      },
      {
        state: 'only-session',
        routes: [
          { method: 'GET', path: '/auth/sessions', info: { sessions: SESSIONS.slice(0, 1) } },
        ],
      },
      {
        state: 'sessions-empty-list',
        routes: [{ method: 'GET', path: '/auth/sessions', info: { sessions: [] } }],
        notes: 'ok with an empty list shows the loading text forever',
      },
      {
        state: 'safety-reach-nobody',
        routes: [
          {
            method: 'GET',
            path: '/guard/safety',
            info: {
              duressEnabled: false,
              hasPin: false,
              alertsReach: 'nobody',
              appSirenEnabled: true,
              maskedCameras: [{ cameraId: 7, name: 'Dormitorio' }],
            },
          },
        ],
      },
      {
        state: 'calls-off',
        routes: [
          {
            method: 'GET',
            path: '/notification/call-preferences',
            info: {
              userId: 1,
              enabled: false,
              guardCritical: 'call',
              guardIntruder: 'call',
              guardEscalation: 'notify',
              guardArrival: 'notify',
              agenda: 'notify',
              assistant: 'call',
              quietStartHour: -1,
              quietEndHour: -1,
              dndUntil: 0,
              criticalBypass: true,
              mutedEnvironmentIds: [],
              updatedAt: NOW,
              agendaLeadMinutes: 0,
              quietDays: 0,
              ringSeconds: 30,
              pushDelaySeconds: 0,
              liveAnnounce: false,
              lang: '',
            },
          },
        ],
      },
      {
        state: 'privacy-undecided',
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
      { state: 'sign-out-all-confirm', act: click('screens.sessions.sign-out-everywhere') },
      {
        state: 'pin-setup-dialog',
        routes: [
          {
            method: 'GET',
            path: '/guard/safety',
            info: {
              duressEnabled: true,
              hasPin: false,
              hasPhrase: true,
              alertsReach: 'others',
              appSirenEnabled: true,
              maskedCameras: [],
            },
          },
        ],
        act: clickText('screens.safety.pins.create'),
      },
      {
        state: 'phrase-dialog',
        routes: [
          {
            method: 'GET',
            path: '/guard/safety',
            info: {
              duressEnabled: true,
              hasPin: false,
              hasPhrase: false,
              alertsReach: 'others',
              appSirenEnabled: true,
              maskedCameras: [],
            },
          },
        ],
        act: clickText('screens.safety.phrase.create'),
      },
      { state: 'notice-dialog', act: clickText('screens.privacy.consent.read-notice', 'last') },
      { state: 'unpair-confirm', act: clickText('screens.profile.unpair') },
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
      {
        state: 'module-request-resident',
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
        state: 'settings-dialog',
        before: async (context) => {
          await context.addInitScript(fakeMicrophone);
        },
        act: steps(async () => {
          await sleep(1500);
        }, click('screens.voice.settings')),
      },
    ],
  },
];
