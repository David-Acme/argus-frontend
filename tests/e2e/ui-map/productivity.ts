import type { BrowserContext } from 'playwright-core';
import { ownerContext } from '../support/fake-argus';
import { emit } from '../support/harness';
import { BASELINE } from '../support/ui-map/backend';
import { sleep, type Scene } from '../support/ui-map/capture';
import {
  DAY,
  HOUR,
  HOUSEHOLD,
  LONG_TEXT,
  MIDNIGHT,
  NOW,
  PRODUCTIVITY,
  event,
  member,
  message,
  project,
  share,
  task,
  user,
} from '../support/ui-map/data';
import type { Row, ScreenSpec } from '../support/ui-map/scenario';
import { button, say } from '../support/ui-map/text';
import type { TranslationKey } from '../../../src/core/types';

const tab =
  (key: TranslationKey) =>
  async (scene: Scene): Promise<void> => {
    await scene.page
      .getByRole('tab', { name: say(scene, key), exact: true })
      .first()
      .click();
    await sleep(700);
  };

const click =
  (key: TranslationKey, which: 'first' | 'last' = 'first') =>
  async (scene: Scene): Promise<void> => {
    const locator = button(scene, key);
    await (which === 'first' ? locator.first() : locator.last()).click({ timeout: 8000 });
    await sleep(800);
  };

const clickText =
  (value: string | RegExp) =>
  async (scene: Scene): Promise<void> => {
    await scene.page
      .getByText(value, { exact: typeof value === 'string' })
      .first()
      .click({ timeout: 8000 });
    await sleep(800);
  };

const steps =
  (...actions: ((scene: Scene) => Promise<void>)[]) =>
  async (scene: Scene): Promise<void> => {
    for (const action of actions) await action(scene);
  };

const delay =
  (pattern: string, ms: number) =>
  async (context: BrowserContext): Promise<void> => {
    await context.route(pattern, async (route) => {
      await sleep(ms);
      await route.continue().catch(() => undefined);
    });
  };

const busyDay: Row[] = Array.from({ length: 6 }, (_, index) =>
  event(
    1200 + index,
    index === 0 ? LONG_TEXT : `Cita ${index + 1}`,
    MIDNIGHT + DAY + HOUR * (9 + index)
  )
);

const crowdedDay: Row[] = Array.from({ length: 32 }, (_, index) =>
  event(1300 + index, `Turno ${index + 1}`, MIDNIGHT + DAY * 2 + HOUR * 8 + index * 900, {
    endsAt: MIDNIGHT + DAY * 2 + HOUR * 8 + index * 900 + 900,
  })
);

const AGENDA_ROWS: Row[] = [...PRODUCTIVITY, ...busyDay, share(1400, 900, 2, 'edit')];

const openMore = async (scene: Scene): Promise<void> => {
  await scene.page
    .getByLabel(say(scene, 'screens.projects.more', { name: 'Mudanza' }))
    .first()
    .click({ timeout: 8000 });
  await sleep(800);
};

const openNew = click('screens.agenda.page.new', 'last');

const openDetail = clickText('Reunión con el arquitecto');

export const PRODUCTIVITY_SCREENS: ScreenSpec[] = [
  {
    screen: 'agenda',
    inApp: true,
    perViewport: true,
    route: '/agenda',
    path: '/agenda',
    routes: BASELINE,
    states: [
      {
        state: 'default-view',
        rows: AGENDA_ROWS,
        main: true,
        notes:
          'the week strip and the day list; list | detail from tablet, the mini month and filters on desktop',
      },
      { state: 'empty-default-view', notes: 'Nada para hoy, suggestions and the free next days' },
      {
        state: 'by-argus',
        rows: [
          ...PRODUCTIVITY,
          event(1500, 'Cita con el dentista', MIDNIGHT + HOUR * 15, { createdVia: 'assistant' }),
        ],
        notes: 'an event Argus made ends its meta with «por Argus»',
      },
      {
        state: 'deep-link-cold',
        rows: AGENDA_ROWS,
        deep: true,
        notes: 'a cold deep link to a module route bounces to Home',
      },
      { state: 'day', rows: AGENDA_ROWS, act: tab('screens.agenda.page.view-day') },
      { state: 'day-empty', act: tab('screens.agenda.page.view-day') },
      { state: 'month-open', rows: AGENDA_ROWS, act: click('screens.agenda.page.month-open') },
      {
        state: 'day-crowded',
        rows: [...AGENDA_ROWS, ...crowdedDay],
        path: `/agenda?at=${(MIDNIGHT + DAY * 2) * 1000}`,
        act: tab('screens.agenda.page.view-day'),
        notes: '32 short events on one day',
      },
      {
        state: 'list-crowded',
        rows: [...AGENDA_ROWS, ...crowdedDay],
        path: `/agenda?at=${(MIDNIGHT + DAY * 2) * 1000}`,
      },
      { state: 'entry-detail', rows: AGENDA_ROWS, act: openDetail },
      {
        state: 'detail-more-menu',
        rows: AGENDA_ROWS,
        act: steps(openDetail, click('screens.agenda.detail.more', 'last')),
      },
      {
        state: 'occurrence-edit-scope',
        rows: AGENDA_ROWS,
        path: `/agenda?at=${(MIDNIGHT + DAY * 7) * 1000}`,
        act: steps(clickText('Yoga'), click('screens.agenda.detail.edit', 'last')),
        notes:
          'next Monday holds only the weekly Yoga series: the sheet asks Solo esta / Toda la serie',
      },
      { state: 'create-form', rows: AGENDA_ROWS, act: openNew },
      {
        state: 'create-form-errors',
        rows: AGENDA_ROWS,
        act: async (scene) => {
          await openNew(scene);
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.agenda.sheet.time') })
            .first()
            .fill('9:3');
          await button(scene, 'screens.agenda.sheet.save').last().click();
          await sleep(700);
        },
      },
      {
        state: 'create-form-event',
        rows: AGENDA_ROWS,
        act: steps(openNew, tab('screens.agenda.kind.event')),
      },
      {
        state: 'create-form-all-day',
        rows: AGENDA_ROWS,
        act: async (scene) => {
          await openNew(scene);
          await tab('screens.agenda.kind.event')(scene);
          await scene.page
            .getByRole('switch', { name: say(scene, 'screens.agenda.sheet.all-day') })
            .first()
            .click();
          await sleep(500);
        },
      },
      {
        state: 'day-picker',
        rows: AGENDA_ROWS,
        act: async (scene) => {
          await openNew(scene);
          const day = say(scene, 'screens.agenda.sheet.day');
          await scene.page
            .getByRole('button', { name: new RegExp(`^${day}, `) })
            .last()
            .click();
          await sleep(700);
        },
      },
      {
        state: 'edit-form',
        rows: AGENDA_ROWS,
        path: `/agenda?edit=900&at=${MIDNIGHT * 1000}`,
      },
      {
        state: 'share-dialog-empty',
        rows: AGENDA_ROWS,
        act: async (scene) => {
          await openDetail(scene);
          await click('screens.agenda.detail.more', 'last')(scene);
          await scene.page
            .getByText(say(scene, 'screens.agenda.share'), { exact: true })
            .last()
            .click();
          await sleep(900);
        },
      },
      {
        state: 'save-error-toast',
        rows: AGENDA_ROWS,
        routes: [
          {
            method: 'POST',
            path: '/calendar-event',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
        act: async (scene) => {
          await openNew(scene);
          await tab('screens.agenda.kind.event')(scene);
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.agenda.sheet.title-event') })
            .first()
            .fill('Cena con amigos');
          await button(scene, 'screens.agenda.sheet.save').last().click();
          await sleep(1500);
        },
      },
      {
        state: 'read-only-guest',
        role: 'guest',
        rows: AGENDA_ROWS,
        context: {
          capabilities: ['profile.read', 'agenda.read', 'notifications.read', 'reminders.read'],
        },
        notes:
          'a role with agenda.read but no table write: the route bounces home unless the role matrix allows reading',
      },
      {
        state: 'module-off-redirect',
        rows: AGENDA_ROWS,
        context: { modules: ownerContext({ productivity: false }).modules },
      },
    ],
  },
  {
    screen: 'projects',
    inApp: true,
    route: '/projects',
    path: '/projects',
    routes: BASELINE,
    states: [
      { state: 'populated', rows: PRODUCTIVITY, main: true },
      { state: 'empty' },
      {
        state: 'many-long',
        rows: [
          ...PRODUCTIVITY,
          ...Array.from({ length: 12 }, (_, index) =>
            project(1500 + index, index % 2 ? `Proyecto ${index}` : LONG_TEXT, {
              description: LONG_TEXT,
              status: index % 4 === 0 ? 'done' : 'active',
            })
          ),
        ],
      },
      { state: 'new-project-form', rows: PRODUCTIVITY, act: click('screens.projects.new-project') },
      {
        state: 'new-project-errors',
        rows: PRODUCTIVITY,
        act: async (scene) => {
          await click('screens.projects.new-project')(scene);
          await button(scene, 'screens.projects.sheet.save').last().click();
          await sleep(700);
        },
      },
    ],
  },
  {
    screen: 'project',
    inApp: true,
    route: '/projects/[id]',
    path: '/projects/700',
    routes: BASELINE,
    states: [
      { state: 'populated', rows: PRODUCTIVITY, main: true },
      {
        state: 'no-tasks',
        rows: [...HOUSEHOLD, project(700, 'Mudanza')],
      },
      {
        state: 'by-argus',
        rows: [
          ...HOUSEHOLD,
          project(700, 'Mudanza'),
          task(805, 700, 'Pedir presupuesto del camión', { createdVia: 'assistant' }),
          task(806, 700, 'Empacar los libros'),
        ],
        notes: 'a task Argus made ends its meta with «por Argus»',
      },
      {
        state: 'many-long',
        rows: [
          ...PRODUCTIVITY,
          ...Array.from({ length: 18 }, (_, index) =>
            task(1600 + index, 700, index % 3 ? `Tarea ${index}` : LONG_TEXT, {
              status: ['todo', 'doing', 'done'][index % 3],
              dueAt: NOW + (index - 6) * DAY,
            })
          ),
        ],
      },
      {
        state: 'view-only-member',
        path: '/projects/710',
        rows: [
          ...HOUSEHOLD,
          project(710, 'Casa de playa', { ownerId: 2 }),
          member(720, 710, 1, 'view'),
          task(730, 710, 'Pintar la reja', { status: 'doing' }),
        ],
      },
      {
        state: 'more-menu',
        rows: [...PRODUCTIVITY, member(740, 700, 2, 'edit')],
        act: openMore,
      },
      { state: 'new-task-form', rows: PRODUCTIVITY, act: click('screens.projects.new-task') },
      { state: 'edit-task-form', rows: PRODUCTIVITY, act: clickText('Llamar a la mudanza') },
      {
        state: 'members-dialog',
        rows: [...PRODUCTIVITY, member(740, 700, 2, 'edit')],
        act: async (scene) => {
          await openMore(scene);
          await scene.page
            .getByRole('menuitem', { name: say(scene, 'screens.projects.members') })
            .first()
            .click();
          await sleep(800);
        },
      },
      {
        state: 'save-error-toast',
        rows: PRODUCTIVITY,
        routes: [
          {
            method: 'POST',
            path: '/project-task',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
        act: async (scene) => {
          await click('screens.projects.new-task')(scene);
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.projects.sheet.title') })
            .first()
            .fill('Contratar pintor');
          await button(scene, 'screens.projects.sheet.save').last().click();
          await sleep(1500);
        },
      },
    ],
  },
  {
    screen: 'conversations',
    inApp: true,
    route: '/conversations',
    path: '/conversations',
    routes: BASELINE,
    rows: [user(2, 'Luis', 'Ruiz', 'resident'), user(3, 'Carlos', 'Paredes', 'guard')],
    states: [
      {
        state: 'list-populated',
        main: true,
        rows: [
          message(1, { direction: 'out', body: '¿Qué hay en la agenda hoy?', leg: 'laptop' }),
          message(2, { body: 'Nada hasta las seis.', leg: 'camera' }),
          message(3, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: 'La cena está lista',
            state: 'received',
            isRead: false,
          }),
          message(4, {
            counterpartId: 3,
            counterpartName: 'Carlos',
            direction: 'out',
            kind: 'relay',
            body: 'Trae pan',
            state: 'notified',
          }),
          message(5, {
            counterpartId: 9,
            counterpartName: '',
            kind: 'visitor',
            body: '',
            isRead: false,
          }),
        ],
      },
      { state: 'list-empty' },
      {
        state: 'list-many-unread',
        rows: Array.from({ length: 101 }, (_, index) =>
          message(10 + index, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: index === 100 ? LONG_TEXT : `Mensaje ${index}`,
            state: 'received',
            isRead: false,
          })
        ),
      },
      {
        state: 'thread-argus',
        path: '/conversations/0',
        rows: [
          message(1, {
            direction: 'out',
            body: '¿Qué hay en la agenda hoy?',
            leg: 'laptop',
            createdAt: NOW - DAY - 600,
          }),
          message(2, { body: 'Nada hasta las seis.', leg: 'camera', createdAt: NOW - DAY - 500 }),
          message(6, { direction: 'out', body: 'Recuérdame comprar pan', leg: 'phone' }),
          message(7, { body: 'Listo, te lo recuerdo a las 18:00.' }),
        ],
      },
      {
        state: 'thread-argus-results',
        path: '/conversations/0',
        rows: [
          message(20, {
            direction: 'out',
            body: 'Pon el modo noche',
            leg: 'phone',
            createdAt: NOW - 120,
          }),
          message(21, { body: 'Modo Noche puesto. Vigilo puertas y patio.', createdAt: NOW - 110 }),
          message(22, {
            direction: 'out',
            body: 'Pasa lo del dentista al viernes a las 10',
            leg: 'phone',
            createdAt: NOW - 60,
          }),
          message(23, {
            body: 'Listo, moví «Dentista» al viernes a las 10:00.',
            createdAt: NOW - 50,
          }),
        ],
        act: async (_scene, baseUrl) => {
          await sleep(1200);
          await emit(baseUrl, [
            {
              frame: {
                type: 'voice:result',
                payload: {
                  id: 31,
                  tool: 'app.set_guard_mode',
                  ok: true,
                  data: {
                    mode: 'night',
                    previousMode: 'home',
                    environmentId: 1,
                    environmentName: 'Casa',
                  },
                },
              },
            },
            {
              frame: {
                type: 'voice:result',
                payload: {
                  id: 32,
                  tool: 'calendar.move_event',
                  ok: true,
                  data: {
                    eventId: 7,
                    title: 'Dentista',
                    startsAt: NOW + 3 * DAY,
                    endsAt: NOW + 3 * DAY + HOUR,
                    previousStartsAt: NOW + 2 * DAY,
                  },
                },
              },
            },
          ]);
          await sleep(1000);
        },
        notes:
          'voice:result is the turn result the backend sends (VoiceResult = 16); live results anchor by arrival time, persisted ones on the line that carries them',
      },
      {
        state: 'thread-argus-module-off',
        path: '/conversations/0',
        rows: [
          message(24, {
            direction: 'out',
            body: 'Crea el proyecto Mudanza',
            leg: 'phone',
            createdAt: NOW - 30,
          }),
          message(25, {
            body: 'Productividad está apagado; actívalo y lo creo.',
            createdAt: NOW - 20,
          }),
        ],
        act: async (_scene, baseUrl) => {
          await sleep(1200);
          await emit(baseUrl, [
            {
              frame: {
                type: 'voice:result',
                payload: {
                  id: 33,
                  tool: 'modules.enable',
                  ok: true,
                  data: { module: 'productivity' },
                },
              },
            },
          ]);
          await sleep(1000);
        },
      },
      {
        state: 'thread-argus-mic-denied',
        path: '/conversations/0',
        rows: [message(26, { body: 'Hola, David.', createdAt: NOW - 30 })],
        act: async (scene) => {
          await click('screens.conversations.composer.talk')(scene);
          await sleep(2500);
        },
        notes: 'headless Chromium denies the microphone: the hold fails with the permission notice',
      },
      {
        state: 'thread-member',
        path: '/conversations/2',
        routes: [{ method: 'PATCH', path: '/conversation/2/read', info: { updated: 1 } }],
        rows: [
          message(3, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: 'La cena está lista',
            state: 'received',
          }),
          message(8, {
            counterpartId: 2,
            counterpartName: 'Luis',
            direction: 'out',
            kind: 'reply',
            body: 'Voy en 10 minutos',
            state: 'delivered',
            replyToKey: 'msg-3',
          }),
          message(9, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: LONG_TEXT,
            state: 'received',
          }),
        ],
      },
      {
        state: 'thread-member-long-draft',
        path: '/conversations/2',
        rows: [
          message(3, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: 'La cena está lista',
            state: 'received',
          }),
        ],
        act: async (scene) => {
          await scene.page
            .getByRole('textbox')
            .first()
            .fill(`${LONG_TEXT} ${LONG_TEXT} ${LONG_TEXT} ${LONG_TEXT}`);
          await sleep(500);
        },
        notes: 'draft over 500 characters: counter in red, send disabled',
      },
      {
        state: 'thread-actions-confirm',
        path: '/conversations/2',
        rows: [
          message(3, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: 'La cena está lista',
            state: 'received',
          }),
        ],
        act: async (scene) => {
          await click('screens.conversations.clear')(scene);
          await sleep(700);
        },
      },
      { state: 'thread-empty', path: '/conversations/42' },
      { state: 'thread-argus-empty', path: '/conversations/0' },
      { state: 'thread-invalid-id', path: '/conversations/abc' },
      {
        state: 'mark-read-failed-toast',
        path: '/conversations/2',
        rows: [
          message(3, {
            counterpartId: 2,
            counterpartName: 'Luis',
            kind: 'relay',
            body: 'La cena está lista',
            state: 'received',
            isRead: false,
          }),
        ],
      },
    ],
  },
  {
    screen: 'activity',
    inApp: true,
    route: '/settings/activity',
    path: '/settings/activity',
    routes: BASELINE,
    rows: HOUSEHOLD,
    states: [
      {
        state: 'populated',
        main: true,
        routes: [
          {
            method: 'GET',
            path: '/sync/activity',
            info: {
              items: [
                {
                  id: 1,
                  userId: 1,
                  recordId: 700,
                  table: 'project',
                  module: 'productivity',
                  action: 'create',
                  oldData: null,
                  newData: { title: 'Mudanza' },
                  ipAddress: '192.168.1.20',
                  createdAt: NOW - 600,
                },
                {
                  id: 2,
                  userId: 2,
                  recordId: 801,
                  table: 'project_task',
                  module: 'productivity',
                  action: 'update',
                  oldData: null,
                  newData: { title: 'Llamar a la mudanza' },
                  createdAt: NOW - 3600,
                },
                {
                  id: 3,
                  userId: 1,
                  recordId: 3,
                  table: 'camera',
                  module: 'surveillance',
                  action: 'delete',
                  oldData: null,
                  newData: null,
                  createdAt: NOW - DAY,
                },
                {
                  id: 4,
                  userId: 1,
                  recordId: 0,
                  table: 'module',
                  module: 'core',
                  action: 'update',
                  oldData: null,
                  newData: { event: 'enabled', moduleId: 'surveillance' },
                  createdAt: NOW - DAY * 2,
                },
                {
                  id: 5,
                  userId: 9,
                  recordId: 1,
                  table: 'foo',
                  module: 'core',
                  action: 'read',
                  oldData: null,
                  newData: null,
                  createdAt: NOW - DAY * 3,
                },
              ],
              nextCursor: 'c1',
            },
          },
        ],
      },
      { state: 'empty' },
      {
        state: 'failed',
        routes: [
          {
            method: 'GET',
            path: '/sync/activity',
            status: 500,
            errors: { code: 'INTERNAL_ERROR', message: 'x' },
          },
        ],
      },
      { state: 'loading', before: delay('**/__api/sync/activity*', 60000) },
      {
        state: 'pick-dates',
        act: async (scene) => {
          await scene.page
            .getByRole('tab', { name: say(scene, 'screens.activity.periods.custom'), exact: true })
            .click();
          await sleep(700);
        },
      },
      {
        state: 'period-all-clear-filters',
        act: async (scene) => {
          await scene.page
            .getByText(say(scene, 'screens.activity.filters.all-actions'), { exact: true })
            .first()
            .click();
          await sleep(700);
        },
      },
    ],
  },
];
