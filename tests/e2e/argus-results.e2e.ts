import type { Page } from 'playwright-core';
import { connected, emit, routes, store } from './support/harness';
import { expect, test } from './support/devices';
import type { SecondDevice } from './support/devices';

const LIVE_MS = 5000;

const at = Math.floor(Date.now() / 1000) - 600;

const OFFER_ID = 'a1b2c3d4e5f60718';

const offer = {
  id: OFFER_ID,
  tool: 'memory.remind',
  ok: true,
  data: { title: 'Pay the water bill', remindAt: at + 86_400, confirm: true },
};

const message = (id: number, patch: Record<string, unknown>) => ({
  id,
  userId: 1,
  counterpartId: 0,
  counterpartName: '',
  direction: 'in',
  kind: 'turn',
  body: '',
  leg: null,
  state: 'delivered',
  messageKey: `msg-${id}`,
  replyToKey: null,
  result: null,
  via: null,
  isRead: true,
  readAt: null,
  createdAt: at + id,
  updatedAt: null,
  deletedAt: null,
  ...patch,
});

type Logged = { requests: string[]; bodies: Record<string, string> };

const logged = async (baseUrl: string): Promise<Logged> =>
  (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as Logged;

const textCount = (page: Page, text: string): Promise<number> =>
  page.getByText(text, { exact: true }).count();

const buttonCount = (page: Page, name: string): Promise<number> =>
  page.getByRole('button', { name, exact: true }).count();

const REPLY = 'On it.';

const openThread = async (baseUrl: string, second: SecondDevice): Promise<void> => {
  await second.open('/conversations/0');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await second.page.getByRole('textbox').first().waitFor();
};

const openExchange = async (baseUrl: string, second: SecondDevice): Promise<void> => {
  await store(
    baseUrl,
    'conversation_message',
    message(50, { direction: 'out', body: 'Help me with tomorrow', leg: 'laptop' })
  );
  await store(baseUrl, 'conversation_message', message(51, { body: REPLY }));
  await openThread(baseUrl, second);
  await expect.poll(() => textCount(second.page, REPLY), { timeout: 10000 }).toBe(1);
};

test('a reminder offer is answered by button with its id, and the kept reminder settles the same card', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await openExchange(baseUrl, second);

  await emit(baseUrl, [{ frame: { type: 'voice:result', payload: offer } }]);
  await expect.poll(() => buttonCount(page, 'Yes, remind me'), { timeout: LIVE_MS }).toBe(1);
  await page.getByRole('button', { name: 'Yes, remind me', exact: true }).click();

  await expect
    .poll(async () => (await logged(baseUrl)).bodies['WS voice:confirm @B'], { timeout: LIVE_MS })
    .toBe(JSON.stringify({ id: OFFER_ID, answer: 'yes' }));
  expect(
    (await logged(baseUrl)).requests.filter((line) => line.startsWith('WS voice:text'))
  ).toEqual([]);
  await expect.poll(() => buttonCount(page, 'Yes, remind me'), { timeout: LIVE_MS }).toBe(0);
  await expect.poll(() => page.getByText(/· You said yes$/).count(), { timeout: LIVE_MS }).toBe(1);

  await emit(baseUrl, [
    {
      frame: {
        type: 'voice:result',
        payload: { ...offer, data: { title: offer.data.title, remindAt: offer.data.remindAt } },
      },
    },
  ]);
  await expect
    .poll(() => page.getByText(/· I will remind you$/).count(), { timeout: LIVE_MS })
    .toBe(1);
  expect(await textCount(page, offer.data.title)).toBe(1);

  expect(second.escapes).toEqual([]);
});

test('a spoken no settles the asking card with the same id instead of dropping it', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await openExchange(baseUrl, second);

  await emit(baseUrl, [{ frame: { type: 'voice:result', payload: offer } }]);
  await expect.poll(() => buttonCount(page, 'No, thanks'), { timeout: LIVE_MS }).toBe(1);
  await emit(baseUrl, [
    {
      frame: {
        type: 'voice:result',
        payload: { id: OFFER_ID, tool: 'memory.remind', ok: false, data: {} },
      },
    },
  ]);

  await expect
    .poll(() => page.getByText(/· I did not keep it$/).count(), { timeout: LIVE_MS })
    .toBe(1);
  expect(await buttonCount(page, 'No, thanks')).toBe(0);
  expect(await textCount(page, offer.data.title)).toBe(1);

  expect(second.escapes).toEqual([]);
});

test('the cards come back from the conversation itself, settled, and a spoken turn says so', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await store(
    baseUrl,
    'conversation_message',
    message(1, {
      direction: 'out',
      body: 'Remind me to pay the water bill',
      leg: 'phone',
      via: 'voice',
    })
  );
  await store(
    baseUrl,
    'conversation_message',
    message(2, { body: 'Shall I remind you tomorrow?', result: [offer], via: 'voice' })
  );
  await store(
    baseUrl,
    'conversation_message',
    message(3, { direction: 'out', body: 'yes', leg: 'phone', via: 'text' })
  );
  await store(
    baseUrl,
    'conversation_message',
    message(4, {
      body: 'Done.',
      result: [{ ...offer, data: { title: offer.data.title, remindAt: offer.data.remindAt } }],
      via: 'text',
    })
  );
  await openThread(baseUrl, second);

  await expect
    .poll(() => textCount(page, 'Shall I remind you tomorrow?'), { timeout: 10000 })
    .toBe(1);
  await expect
    .poll(() => page.getByText(/· I will remind you$/).count(), { timeout: LIVE_MS })
    .toBe(1);
  expect(await buttonCount(page, 'Yes, remind me')).toBe(0);
  expect(await textCount(page, offer.data.title)).toBe(1);
  await expect
    .poll(() => page.getByText(/^From the phone · by voice · /).count(), { timeout: LIVE_MS })
    .toBe(1);
  expect(await page.getByText(/^By voice · /).count()).toBe(1);

  expect(second.escapes).toEqual([]);
});

test('a moved event undoes through the app PATCH with its previous times, and a day lists what it read', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await routes(baseUrl, [{ method: 'PATCH', path: '/calendar-event/41', info: { id: 41 } }]);
  await openExchange(baseUrl, second);

  await emit(baseUrl, [
    {
      frame: {
        type: 'voice:result',
        payload: {
          id: 'f00dfeedf00dfeed',
          tool: 'calendar.move_event',
          ok: true,
          data: {
            eventId: 41,
            title: 'Dentist',
            startsAt: at + 90_000,
            endsAt: at + 93_600,
            previousStartsAt: at + 86_400,
            previousEndsAt: at + 90_000,
          },
        },
      },
    },
    {
      frame: {
        type: 'voice:result',
        payload: {
          id: 'beadbeadbeadbead',
          tool: 'calendar.list_events',
          ok: true,
          data: {
            day: at,
            items: [
              { id: 1, title: 'Standup', startsAt: at + 3_600, allDay: false, kind: 'event' },
              {
                id: 2,
                title: 'Dinner with Luis',
                startsAt: at + 7_200,
                allDay: false,
                kind: 'event',
              },
            ],
          },
        },
      },
    },
  ]);
  await expect.poll(() => buttonCount(page, 'Undo'), { timeout: LIVE_MS }).toBe(1);
  await expect.poll(() => textCount(page, 'Dinner with Luis'), { timeout: LIVE_MS }).toBe(1);
  expect(await textCount(page, '2 things')).toBe(1);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(async () => (await logged(baseUrl)).bodies['PATCH /calendar-event/41 @B'], {
      timeout: LIVE_MS,
    })
    .toBe(JSON.stringify({ startsAt: at + 86_400, endsAt: at + 90_000 }));

  expect(second.escapes).toEqual([]);
});
