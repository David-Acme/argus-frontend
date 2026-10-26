import type { RouteSpec } from '../support/fake-argus';
import { ownerContext } from '../support/fake-argus';
import { emit } from '../support/harness';
import { sleep, type Scene } from '../support/ui-map/capture';
import {
  BASELINE,
  CAMERAS,
  EMPTY_OVERVIEW,
  ENVIRONMENTS,
  EPISODES,
  RESPONSE_PLAN,
  camera,
} from '../support/ui-map/backend';
import { DAY, HOUSEHOLD, LONG_TEXT, NOW } from '../support/ui-map/data';
import type { Row, ScreenSpec } from '../support/ui-map/scenario';
import { button, say } from '../support/ui-map/text';
import type { TranslationKey } from '../../../src/core/types';
import { environment } from '../support/screens';

const click =
  (key: TranslationKey, which: 'first' | 'last' = 'first') =>
  async (scene: Scene): Promise<void> => {
    const locator = button(scene, key);
    await (which === 'first' ? locator.first() : locator.last()).click({ timeout: 8000 });
    await sleep(900);
  };

const steps =
  (...actions: ((scene: Scene, baseUrl: string) => Promise<void>)[]) =>
  async (scene: Scene, baseUrl: string): Promise<void> => {
    for (const action of actions) await action(scene, baseUrl);
  };

const openCamera =
  (name: string) =>
  async (scene: Scene): Promise<void> => {
    await scene.page
      .getByRole('button', { name: new RegExp(`^${name}, `) })
      .first()
      .click({ timeout: 10000 });
    await sleep(2500);
  };

const openRow =
  (key: TranslationKey) =>
  async (scene: Scene): Promise<void> => {
    await scene.page
      .getByRole('button', { name: new RegExp(`^${say(scene, key)}`) })
      .first()
      .click({ timeout: 10000 });
    await sleep(1500);
  };

const openMenu = async (scene: Scene): Promise<void> => {
  await scene.page
    .getByLabel(say(scene, 'screens.cameras.menu.more'))
    .first()
    .click({ timeout: 8000 });
  await sleep(900);
};

const menuItem =
  (key: TranslationKey) =>
  async (scene: Scene): Promise<void> => {
    await scene.page.getByText(say(scene, key), { exact: true }).last().click({ timeout: 8000 });
    await sleep(900);
  };

const openPatrol = async (scene: Scene): Promise<void> => {
  await scene.page
    .getByRole('button', {
      name: new RegExp(`→|^${say(scene, 'screens.cameras.patrol.create')}`),
    })
    .first()
    .click({ timeout: 10000 });
  await sleep(900);
};

const mediaFrame =
  (frame: Record<string, unknown>) =>
  async (_scene: Scene, baseUrl: string): Promise<void> => {
    await emit(baseUrl, [{ frame }]);
    await sleep(1500);
  };

const CAMERA_DETAIL: RouteSpec[] = [
  {
    method: 'GET',
    path: '/camera/3/status',
    info: {
      ok: true,
      model: 'C210',
      firmware: '1.3.4',
      privacyEnabled: false,
      ledEnabled: true,
      motionEnabled: true,
      autoTrackEnabled: false,
      dayNightMode: 'auto',
      motionSensitivity: 50,
      sdCard: { status: 'normal', total: '64 GB', free: '12 GB' },
    },
  },
  {
    method: 'GET',
    path: '/camera/3/presets',
    info: { preset: { id: ['1', '2', '3'], name: ['Puerta', 'Reja', 'Jardín'] } },
  },
  {
    method: 'GET',
    path: '/camera/3/aim',
    info: {
      cameraId: 3,
      ptz: true,
      homePreset: '1',
      atHome: true,
      pan: 0,
      tilt: 0,
      lease: { holder: 'none', userId: 0, mine: false, sinceMs: 0, parkUntilMs: 0 },
      activity: 'idle',
      settings: {
        activeLook: true,
        followIntruders: false,
        noAimSectors: [
          { name: 'Ventana del vecino', panFrom: -30, panTo: 10, tiltFrom: -5, tiltTo: 20 },
        ],
      },
      wear: { movesToday: 3, dailyCap: 200 },
    },
  },
  {
    method: 'GET',
    path: '/camera/3/patrol',
    info: {
      patrol: {
        cameraId: 3,
        stops: ['1', '2', '3'],
        dwellSeconds: 30,
        enabled: true,
        window: { startHour: 22, endHour: 6 },
        createdAt: NOW - DAY,
        updatedAt: null,
      },
    },
  },
  {
    method: 'GET',
    path: '/camera/3/clips',
    info: {
      cameraId: 3,
      clips: [901, 902, 903].map((id, index) => ({
        id,
        cameraId: 3,
        trigger: ['motion', 'event', 'look'][index],
        contentType: 'video/mp4',
        codec: 'avc1',
        startedAt: NOW - 3600 * (index + 1),
        durationMs: 12000,
        byteSize: 1048576,
        createdAt: NOW - 3600 * (index + 1),
        expiresAt: NOW + DAY * 30,
      })),
    },
  },
  { method: 'GET', path: '/rtc/ice', info: { iceServers: [], expiresAt: NOW + 600 } },
];

const CAMERA_ROWS: Row[] = [...HOUSEHOLD, ...CAMERAS];

const NO_CLIPS: RouteSpec[] = [
  { method: 'GET', path: '/camera/4/clips', info: { cameraId: 4, clips: [] } },
];

const manyCameras: Row[] = Array.from({ length: 14 }, (_, index) =>
  camera(
    20 + index,
    index % 4 === 0 ? `${LONG_TEXT.slice(0, 50)} ${index}` : `Cámara ${index + 1}`,
    {
      isOnline: index % 3 !== 0,
    }
  )
);

const CATALOG = {
  models: [
    {
      id: 'tapo-c210',
      brand: 'TP-Link Tapo',
      manufacturer: 'TP-Link',
      model: 'C210',
      driver: 'tapo',
      formFactor: 'pan-tilt',
      outdoor: false,
      generic: false,
      resolution: '2304x1296',
      subResolution: '640x360',
      defaults: {
        port: 554,
        onvifPort: 2020,
        username: 'admin',
        streamPath: '/stream1',
        subStreamPath: '/stream2',
      },
      features: {
        ptz: true,
        presets: true,
        autoTrack: true,
        microphone: true,
        speaker: true,
        siren: true,
        privacy: true,
        led: true,
        dayNight: true,
        motion: true,
        sdCard: true,
      },
      note: 'tapo-camera-account',
    },
    {
      id: 'reolink-e1',
      brand: 'Reolink',
      manufacturer: 'Reolink',
      model: 'E1 Outdoor',
      driver: 'onvif',
      formFactor: 'outdoor-pan-tilt',
      outdoor: true,
      generic: false,
      resolution: '2560x1440',
      subResolution: '640x360',
      defaults: {
        port: 554,
        onvifPort: 8000,
        username: 'admin',
        streamPath: '/h264Preview_01_main',
        subStreamPath: '/h264Preview_01_sub',
      },
      features: {
        ptz: true,
        presets: true,
        autoTrack: true,
        microphone: true,
        speaker: true,
        siren: true,
        privacy: false,
        led: false,
        dayNight: true,
        motion: true,
        sdCard: true,
      },
      note: 'reolink-h265',
    },
    {
      id: 'generic-rtsp',
      brand: 'RTSP',
      manufacturer: '',
      model: 'Generic',
      driver: 'rtsp',
      formFactor: 'bullet',
      outdoor: true,
      generic: true,
      resolution: '',
      subResolution: '',
      defaults: { port: 554, onvifPort: 0, username: '', streamPath: '', subStreamPath: '' },
      features: {
        ptz: false,
        presets: false,
        autoTrack: false,
        microphone: false,
        speaker: false,
        siren: false,
        privacy: false,
        led: false,
        dayNight: false,
        motion: false,
        sdCard: false,
      },
      note: 'custom-paths',
    },
  ],
};

const SURVEILLANCE_BASE: RouteSpec[] = [
  ...BASELINE,
  ...CAMERA_DETAIL,
  { method: 'GET', path: '/camera/catalog', info: CATALOG },
];

const watchConversation = (patch: Record<string, unknown>) => ({
  conversationId: 'w1',
  cameraId: 3,
  cameraName: 'Patio trasero',
  state: 'speaking',
  handoff: 'camera',
  audience: 'member',
  startedAt: NOW - 120,
  updatedAt: NOW - 5,
  resumableUntil: null,
  endReason: null,
  turns: [
    { id: 't1', role: 'user', text: 'Argus, ¿quién está en la puerta?', at: NOW - 60, final: true },
    {
      id: 't2',
      role: 'argus',
      text: 'Es el técnico de internet que esperabas. Llegó hace dos minutos.',
      at: NOW - 50,
      final: true,
    },
    { id: 't3', role: 'user', text: 'Dile que ya bajo', at: NOW - 10, final: false },
  ],
  ...patch,
});

export const SURVEILLANCE_SCREENS: ScreenSpec[] = [
  {
    screen: 'cameras',
    inApp: true,
    route: '/cameras',
    path: '/cameras',
    routes: SURVEILLANCE_BASE,
    states: [
      { state: 'populated', rows: CAMERA_ROWS, main: true },
      {
        state: 'empty',
        routes: [{ method: 'GET', path: '/camera/overview', info: EMPTY_OVERVIEW }],
      },
      {
        state: 'empty-guard',
        role: 'guard',
        routes: [{ method: 'GET', path: '/camera/overview', info: EMPTY_OVERVIEW }],
      },
      { state: 'many-long', rows: [...CAMERA_ROWS, ...manyCameras] },
      { state: 'single-featured', rows: [...HOUSEHOLD, camera(3, 'Patio trasero')] },
      {
        state: 'list-density',
        rows: CAMERA_ROWS,
        act: async (scene) => {
          await scene.page
            .getByRole('radio', { name: say(scene, 'screens.cameras.density-list'), exact: true })
            .first()
            .click();
          await sleep(800);
        },
      },
      { state: 'sort-menu', rows: CAMERA_ROWS, act: click('screens.cameras.sort.title') },
      {
        state: 'search-no-match',
        rows: CAMERA_ROWS,
        act: async (scene) => {
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.cameras.search') })
            .first()
            .fill('zzz');
          await sleep(700);
        },
      },
      {
        state: 'recording-paused-banner',
        rows: CAMERA_ROWS,
        routes: [
          {
            method: 'GET',
            path: '/camera/recording',
            info: { paused: true, freeGb: 3, minFreeGb: 10, freeBytes: 3221225472 },
          },
        ],
      },
      { state: 'guest', role: 'guest', rows: CAMERA_ROWS },
      { state: 'connect-wizard-model', rows: CAMERA_ROWS, act: click('screens.cameras.connect') },
      {
        state: 'connect-wizard-connection-errors',
        rows: CAMERA_ROWS,
        act: async (scene) => {
          await click('screens.cameras.connect')(scene);
          await scene.page
            .getByRole('radio', { name: /TP-Link Tapo C210/ })
            .first()
            .click();
          await sleep(800);
          await button(scene, 'common.continue').last().click();
          await sleep(800);
        },
      },
    ],
  },
  {
    screen: 'camera-detail',
    inApp: true,
    route: '/cameras/[id]',
    path: '/cameras',
    routes: SURVEILLANCE_BASE,
    rows: CAMERA_ROWS,
    states: [
      {
        state: 'owner-connecting',
        act: openCamera('Patio trasero'),
        main: true,
        notes: 'live view never paints on web: no binary fMP4 and no WebRTC answer',
      },
      {
        state: 'deep-link-cold',
        path: '/cameras/3',
        deep: true,
        notes: 'a cold deep link redirects to the list before the cache is hydrated',
      },
      {
        state: 'live-offline',
        act: steps(
          openCamera('Patio trasero'),
          mediaFrame({ type: 'camera:closed', payload: {} }),
          mediaFrame({ type: 'camera:closed', payload: {} }),
          mediaFrame({ type: 'camera:closed', payload: {} })
        ),
      },
      {
        state: 'live-unavailable',
        act: steps(
          openCamera('Patio trasero'),
          mediaFrame({ type: 'camera:subscribe_error', status: 404 })
        ),
      },
      {
        state: 'live-too-many-viewers',
        act: steps(
          openCamera('Patio trasero'),
          mediaFrame({
            type: 'camera:subscribe_error',
            status: 429,
            error: 'too_many_viewers_for_camera',
          })
        ),
      },
      { state: 'disabled-camera', act: openCamera('Garaje') },
      { state: 'privacy-camera', act: openCamera('Dormitorio') },
      { state: 'offline-camera-onvif', act: openCamera('Cocina') },
      { state: 'resident', role: 'resident', act: openCamera('Patio trasero') },
      { state: 'guard', role: 'guard', act: openCamera('Patio trasero') },
      { state: 'guest', role: 'guest', act: openCamera('Patio trasero') },
      { state: 'header-menu', act: steps(openCamera('Patio trasero'), openMenu) },
      {
        state: 'edit-form',
        act: steps(openCamera('Patio trasero'), openMenu, menuItem('screens.cameras.edit')),
      },
      {
        state: 'recordings',
        act: steps(openCamera('Patio trasero'), openRow('screens.cameras.rows.recordings')),
      },
      {
        state: 'empty',
        routes: [...SURVEILLANCE_BASE, ...NO_CLIPS],
        act: openCamera('Puerta principal'),
        notes:
          'Puerta principal has no zones and, here, no clips: the rows say so and still lead to their screens',
      },
      {
        state: 'recordings-empty',
        routes: [...SURVEILLANCE_BASE, ...NO_CLIPS],
        act: steps(openCamera('Puerta principal'), openRow('screens.cameras.rows.recordings')),
      },
      {
        state: 'zones-empty',
        routes: [...SURVEILLANCE_BASE, ...NO_CLIPS],
        act: steps(openCamera('Puerta principal'), openRow('screens.cameras.zones')),
      },
      {
        state: 'zones',
        act: steps(openCamera('Patio trasero'), openRow('screens.cameras.zones')),
      },
      {
        state: 'add-zone-form',
        act: steps(
          openCamera('Patio trasero'),
          openRow('screens.cameras.zones'),
          openRow('screens.cameras.add-zone')
        ),
      },
      {
        state: 'settings',
        act: steps(openCamera('Patio trasero'), openRow('screens.cameras.settings')),
      },
      {
        state: 'settings-guard',
        role: 'guard',
        act: steps(openCamera('Patio trasero'), openRow('screens.cameras.settings')),
      },
      {
        state: 'siren-confirm',
        role: 'resident',
        act: steps(openCamera('Patio trasero'), click('screens.cameras.siren-title')),
        notes:
          'the siren is the resident and guard camera action, behind the camera alarm and the owner switch',
      },
      {
        state: 'typed-announcement',
        act: steps(
          openCamera('Patio trasero'),
          openMenu,
          menuItem('screens.cameras.menu.announce')
        ),
      },
      {
        state: 'patrol-dialog',
        act: steps(openCamera('Patio trasero'), openRow('screens.cameras.settings'), openPatrol),
      },
      {
        state: 'add-place-draft',
        act: steps(
          openCamera('Patio trasero'),
          openRow('screens.cameras.settings'),
          openRow('screens.cameras.sight.sector-add')
        ),
      },
      {
        state: 'fullscreen',
        act: steps(openCamera('Patio trasero'), click('screens.cameras.live.fullscreen')),
      },
    ],
  },
  {
    screen: 'security',
    inApp: true,
    route: '/security',
    path: '/security',
    routes: SURVEILLANCE_BASE,
    rows: CAMERA_ROWS,
    states: [
      { state: 'populated', main: true },
      {
        state: 'single-environment',
        routes: [{ method: 'GET', path: '/guard/environments', info: [environment('night')] }],
      },
      {
        state: 'empty',
        routes: [
          { method: 'GET', path: '/guard/environments', info: [environment('home')] },
          { method: 'GET', path: '/guard/episodes', info: { rows: [], nextBefore: null } },
          { method: 'GET', path: '/guard/expected-guests', info: [] },
          { method: 'GET', path: '/guard/maintenance', info: { windows: [] } },
        ],
      },
      {
        state: 'load-error',
        routes: [
          {
            method: 'GET',
            path: '/guard/environments',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      {
        state: 'many-environments-masked',
        routes: [
          {
            method: 'GET',
            path: '/guard/environments',
            info: [
              { ...ENVIRONMENTS[0], maskedCameras: [{ cameraId: 7, name: 'Dormitorio' }] },
              ENVIRONMENTS[1],
              {
                ...environment('armed'),
                id: 3,
                name: 'Oficina San Isidro',
                kind: 'office',
                isDefault: false,
                cameraIds: [],
              },
              {
                ...environment('night'),
                id: 4,
                name: LONG_TEXT.slice(0, 60),
                kind: 'warehouse',
                isDefault: false,
                cameraIds: [6],
              },
            ],
          },
          {
            method: 'GET',
            path: '/guard/episodes',
            info: {
              rows: [...EPISODES, ...EPISODES.map((row) => ({ ...row, id: row.id + 100 }))],
              nextBefore: NOW - DAY * 3,
            },
          },
        ],
      },
      { state: 'resident', role: 'resident' },
      { state: 'guard', role: 'guard' },
      { state: 'new-environment-form', act: click('screens.security.environments.add') },
      { state: 'add-visitor-form', act: click('screens.security.guests.add') },
      {
        state: 'maintenance-dialog',
        act: click('screens.security.maintenance.declare-short', 'last'),
      },
    ],
  },
  {
    screen: 'environment',
    inApp: true,
    route: '/security/[id]',
    path: '/security/1',
    routes: [
      ...SURVEILLANCE_BASE,
      { method: 'GET', path: '/guard/environments/1/response', info: RESPONSE_PLAN },
    ],
    rows: CAMERA_ROWS,
    states: [
      { state: 'owner', main: true },
      { state: 'not-found', path: '/security/99' },
      {
        state: 'masked-cameras',
        routes: [
          {
            method: 'GET',
            path: '/guard/environments',
            info: [
              { ...ENVIRONMENTS[0], maskedCameras: [{ cameraId: 7, name: 'Dormitorio' }] },
              ENVIRONMENTS[1],
            ],
          },
        ],
      },
      {
        state: 'response-load-error',
        routes: [
          {
            method: 'GET',
            path: '/guard/environments/1/response',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      { state: 'resident', role: 'resident' },
      { state: 'guard', role: 'guard' },
      { state: 'actions-menu', act: click('screens.security.environments.actions') },
      {
        state: 'mode-pin-dialog',
        routes: [
          {
            method: 'GET',
            path: '/guard/environments',
            info: [{ ...environment('away'), cameraIds: [3] }],
          },
        ],
        act: async (scene) => {
          await scene.page
            .getByRole('radio', { name: new RegExp(say(scene, 'screens.security.mode.home')) })
            .first()
            .click();
          await sleep(1200);
        },
      },
      { state: 'add-contact-dialog', act: click('screens.response.contacts-editor.add') },
      {
        state: 'camera-context-editor',
        act: async (scene) => {
          await scene.page
            .getByRole('button', { name: 'Patio trasero', exact: true })
            .first()
            .click({ timeout: 8000 });
          await sleep(900);
        },
      },
    ],
  },
  {
    screen: 'watch',
    inApp: true,
    route: '/watch',
    path: '/watch',
    routes: SURVEILLANCE_BASE,
    rows: CAMERA_ROWS,
    states: [
      {
        state: 'live-speaking',
        routes: [
          { method: 'GET', path: '/rtc/watch', info: { conversations: [watchConversation({})] } },
        ],
        main: true,
      },
      { state: 'empty' },
      {
        state: 'waking-discreet',
        routes: [
          {
            method: 'GET',
            path: '/rtc/watch',
            info: {
              conversations: [
                watchConversation({ state: 'waking', audience: 'discreet', handoff: 'offering' }),
              ],
            },
          },
        ],
      },
      {
        state: 'resumable',
        routes: [
          {
            method: 'GET',
            path: '/rtc/watch',
            info: {
              conversations: [
                watchConversation({ state: 'resumable', resumableUntil: NOW + 3600 }),
              ],
            },
          },
        ],
      },
      {
        state: 'visitor-device',
        routes: [
          {
            method: 'GET',
            path: '/rtc/watch',
            info: {
              conversations: [
                watchConversation({ audience: 'visitor', handoff: 'device', cameraName: '' }),
              ],
            },
          },
        ],
      },
      {
        state: 'ended',
        routes: [
          {
            method: 'GET',
            path: '/rtc/watch',
            info: { conversations: [watchConversation({ state: 'ended', endReason: 'goodbye' })] },
          },
        ],
      },
      {
        state: 'end-confirm',
        routes: [
          { method: 'GET', path: '/rtc/watch', info: { conversations: [watchConversation({})] } },
        ],
        act: click('screens.watch.end-action'),
      },
      {
        state: 'module-off-redirect',
        context: { modules: ownerContext({ surveillance: false }).modules },
      },
    ],
  },
];
