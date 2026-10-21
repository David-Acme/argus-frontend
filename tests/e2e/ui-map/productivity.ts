import type { BrowserContext } from 'playwright-core';
import { ownerContext } from '../support/fake-argus';
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
import { button, say, text } from '../support/ui-map/text';
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

const openOptions = async (scene: Scene): Promise<void> => {
  await tab('screens.agenda.view-day')(scene);
  await button(scene, 'screens.agenda.options').first().click({ timeout: 8000 });
  await sleep(800);
};

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
        notes: 'default view depends on width: Day (compact), Week (medium), Month (expanded)',
      },
      { state: 'empty-default-view' },
      {
        state: 'deep-link-cold',
        rows: AGENDA_ROWS,
        deep: true,
        notes: 'a cold deep link to a module route bounces to Home',
      },
      { state: 'day', rows: AGENDA_ROWS, act: tab('screens.agenda.view-day') },
      { state: 'week', rows: AGENDA_ROWS, act: tab('screens.agenda.view-week') },
      { state: 'month', rows: AGENDA_ROWS, act: tab('screens.agenda.view-month') },
      { state: 'agenda-list', rows: AGENDA_ROWS, act: tab('screens.agenda.view-agenda') },
      { state: 'month-empty', act: tab('screens.agenda.view-month') },
      { state: 'agenda-list-empty', act: tab('screens.agenda.view-agenda') },
      {
        state: 'day-next-not-today',
        rows: AGENDA_ROWS,
        act: steps(tab('screens.agenda.view-day'), click('screens.agenda.next')),
        notes: 'the Today pill turns into "Back to today"',
      },
      {
        state: 'day-crowded',
        rows: [...AGENDA_ROWS, ...crowdedDay],
        path: `/agenda?at=${(MIDNIGHT + DAY * 2) * 1000}`,
        act: tab('screens.agenda.view-day'),
        notes: '32 short events on one day',
      },
      {
        state: 'month-crowded',
        rows: [...AGENDA_ROWS, ...crowdedDay],
        act: tab('screens.agenda.view-month'),
      },
      {
        state: 'entry-detail',
        rows: AGENDA_ROWS,
        act: steps(tab('screens.agenda.view-day'), clickText('Reunión con el arquitecto')),
      },
      { state: 'options-menu', rows: AGENDA_ROWS, act: openOptions },
      {
        state: 'occurrence-options-menu',
        rows: AGENDA_ROWS,
        path: `/agenda?at=${(MIDNIGHT + DAY * 7) * 1000}`,
        act: async (scene) => {
          await tab('screens.agenda.view-day')(scene);
          await button(scene, 'screens.agenda.options').first().click({ timeout: 8000 });
          await sleep(800);
        },
        notes: 'next Monday holds only the weekly Yoga series',
      },
      { state: 'create-form', rows: AGENDA_ROWS, act: click('screens.agenda.new-event') },
      {
        state: 'create-form-errors',
        rows: AGENDA_ROWS,
        act: async (scene) => {
          await click('screens.agenda.new-event')(scene);
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.agenda.event-time') })
            .first()
            .fill('9:3');
          await button(scene, 'common.save').last().click();
          await sleep(700);
        },
      },
      {
        state: 'create-form-all-day',
        rows: AGENDA_ROWS,
        act: async (scene) => {
          await click('screens.agenda.new-event')(scene);
          await scene.page
            .getByRole('switch', { name: say(scene, 'screens.agenda.event-all-day') })
            .first()
            .click();
          await sleep(500);
        },
      },
      {
        state: 'day-picker',
        rows: AGENDA_ROWS,
        act: steps(click('screens.agenda.new-event'), click('screens.agenda.pick-day', 'last')),
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
          await openOptions(scene);
          await scene.page.getByText(say(scene, 'common.share'), { exact: true }).last().click();
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
          await click('screens.agenda.new-event')(scene);
          await scene.page
            .getByRole('textbox', { name: say(scene, 'screens.agenda.event-title') })
            .first()
            .fill('Cena con amigos');
          await button(scene, 'common.save').last().click();
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
            })
          ),
          ...Array.from({ length: 18 }, (_, index) =>
            task(1600 + index, 700, index % 3 ? `Tarea ${index}` : LONG_TEXT, {
              status: ['todo', 'doing', 'done'][index % 3],
              dueAt: NOW + (index - 6) * DAY,
            })
          ),
        ],
      },
      {
        state: 'coming-up-empty',
        rows: [...HOUSEHOLD, project(700, 'Mudanza'), task(800, 700, 'Comprar cajas')],
      },
      {
        state: 'view-only-member',
        rows: [
          ...HOUSEHOLD,
          project(710, 'Casa de playa', { ownerId: 2 }),
          member(720, 710, 1, 'view'),
          task(730, 710, 'Pintar la reja', { status: 'doing' }),
        ],
      },
      { state: 'status-menu', rows: PRODUCTIVITY, act: click('screens.projects.select-status') },
      { state: 'new-project-form', rows: PRODUCTIVITY, act: click('screens.projects.new-project') },
      {
        state: 'new-project-errors',
        rows: PRODUCTIVITY,
        act: async (scene) => {
          await click('screens.projects.new-project')(scene);
          await button(scene, 'common.save').last().click();
          await sleep(700);
        },
      },
      { state: 'edit-project-form', rows: PRODUCTIVITY, act: click('common.edit') },
      {
        state: 'delete-project-confirm',
        rows: PRODUCTIVITY,
        act: async (scene) => {
          await click('common.edit')(scene);
          await button(scene, 'common.delete').last().click();
          await sleep(700);
        },
      },
      { state: 'new-task-form', rows: PRODUCTIVITY, act: click('screens.projects.new-task') },
      { state: 'edit-task-form', rows: PRODUCTIVITY, act: clickText('Llamar a la mudanza') },
      {
        state: 'members-dialog',
        rows: [...PRODUCTIVITY, member(740, 700, 2, 'edit')],
        act: click('screens.projects.members'),
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
            .getByRole('textbox', { name: say(scene, 'screens.projects.task-title') })
            .first()
            .fill('Contratar pintor');
          await button(scene, 'common.save').last().click();
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
          await click('screens.conversations.actions')(scene);
          await text(scene, 'screens.conversations.clear').first().click();
          await sleep(700);
        },
      },
      { state: 'thread-empty', path: '/conversations/42' },
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
