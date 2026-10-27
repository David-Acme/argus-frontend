import { appendFileSync } from 'node:fs';
import type { Page } from 'playwright-core';
import { chatScript, connected, emit, store } from './support/harness';
import { expect, test, type SecondDevice } from './support/devices';

const LIVE_MS = 3000;

const at = Math.floor(Date.now() / 1000) - 600;

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
  isRead: true,
  readAt: null,
  receipt: null,
  deliveredAt: null,
  seenAt: null,
  voiceNote: null,
  createdAt: at + id,
  updatedAt: null,
  deletedAt: null,
  ...patch,
});

const requests = async (
  baseUrl: string
): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
  (await fetch(new URL('/__e2e/requests', baseUrl))).json() as Promise<{
    requests: string[];
    bodies: Record<string, string>;
  }>;

const bubble = (page: Page, pattern: RegExp) => page.getByLabel(pattern).first();

const open = async (baseUrl: string, second: SecondDevice, path: string): Promise<void> => {
  await second.open(path);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await second.page.getByRole('textbox').first().waitFor();
};

const syntheticMicrophone = () => {
  const devices = navigator.mediaDevices;
  Object.defineProperty(devices, 'getUserMedia', {
    configurable: true,
    value: async () => {
      const context = new AudioContext();
      const tone = context.createOscillator();
      const out = context.createMediaStreamDestination();
      out.channelCount = 1;
      tone.connect(out);
      tone.start();
      return out.stream;
    },
  });
};

test('a typed message to Argus goes from the clock to ✓✓ on the typing frame, then blue ✓✓ when answered', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await chatScript(baseUrl, { reply: 'Ana is at home.', delayMs: 700 });
  await open(baseUrl, second, '/conversations/0');
  const page = second.page;

  await page.getByRole('textbox', { name: 'Write to Argus' }).fill('Who is home?');
  await page.keyboard.press('Enter');
  await page
    .getByRole('status', { name: 'Argus is typing' })
    .waitFor({ state: 'visible', timeout: LIVE_MS });
  await page.getByText('typing…', { exact: true }).waitFor({ state: 'visible', timeout: LIVE_MS });
  await bubble(page, /^Who is home\?\. .*Delivered$/).waitFor({
    state: 'visible',
    timeout: LIVE_MS,
  });
  await page
    .getByText('Ana is at home.', { exact: true })
    .waitFor({ state: 'visible', timeout: LIVE_MS });
  await bubble(page, /^Who is home\?\. .*Read$/).waitFor({ state: 'visible', timeout: LIVE_MS });
  await page
    .getByRole('status', { name: 'Argus is typing' })
    .waitFor({ state: 'hidden', timeout: LIVE_MS });
  expect(
    (await requests(baseUrl)).requests.filter((line) => line.startsWith('WS voice:text'))
  ).toHaveLength(1);
  expect(second.escapes).toEqual([]);
});

test('a refused message keeps a quiet resend beside it, and the resend sends it again', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await chatScript(baseUrl, { reply: null, fail: true, delayMs: 200 });
  await open(baseUrl, second, '/conversations/0');
  const page = second.page;

  await page.getByRole('textbox', { name: 'Write to Argus' }).fill('Lights off');
  await page.keyboard.press('Enter');
  const resend = page.getByRole('button', { name: 'Send “Lights off” again' });
  await resend.waitFor({ state: 'visible', timeout: LIVE_MS });
  expect(await page.getByRole('alert').count()).toBe(0);
  await chatScript(baseUrl, { reply: 'Done.', delayMs: 200 });
  await resend.click();
  await page.getByText('Done.', { exact: true }).waitFor({ state: 'visible', timeout: LIVE_MS });
  expect(
    (await requests(baseUrl)).requests.filter((line) => line.startsWith('WS voice:text'))
  ).toHaveLength(2);
});

test('a member thread: ✓ sent turns blue ✓✓ on the read diff, «typing…» follows the frames, and delivered and read are reported', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(
    baseUrl,
    'conversation_message',
    message(2, {
      counterpartId: 3,
      counterpartName: 'David',
      kind: 'relay',
      body: 'Dinner is ready',
      state: 'received',
      isRead: false,
    })
  );
  await store(
    baseUrl,
    'conversation_message',
    message(1, {
      counterpartId: 3,
      counterpartName: 'David',
      direction: 'out',
      kind: 'relay',
      body: 'On my way',
      state: 'sent',
      receipt: 'sent',
    })
  );
  await open(baseUrl, second, '/conversations/3');
  const page = second.page;

  await bubble(page, /^On my way\. .*Sent$/).waitFor({ state: 'visible', timeout: 10000 });
  await expect
    .poll(async () => (await requests(baseUrl)).requests, { timeout: LIVE_MS })
    .toContain('PATCH /conversation/3/delivered @B');
  await expect
    .poll(async () => (await requests(baseUrl)).requests, { timeout: LIVE_MS })
    .toContain('PATCH /conversation/3/read @B');
  expect((await requests(baseUrl)).bodies['PATCH /conversation/3/read @B']).toMatch(
    /^\{("upToId":2)?\}$/
  );

  await emit(baseUrl, [
    {
      frame: {
        operation: 6,
        option: 'user_audit_log',
        info: {
          id: 1,
          userId: 1,
          recordId: 1,
          tableName: 'conversation_message',
          changes: {
            receipt: { previous: 'sent', current: 'read' },
            seenAt: { previous: null, current: at + 60 },
          },
          priority: 1,
          eventTimestamp: (at + 60) * 1000,
          createdAt: at + 60,
        },
      },
    },
    {
      frame: {
        operation: 17,
        option: 'conversation_message',
        info: { counterpartId: 3, active: true, ttlMs: 1500 },
      },
    },
  ]);
  await bubble(page, /^On my way\. .*Read$/).waitFor({ state: 'visible', timeout: LIVE_MS });
  await page.getByText('typing…', { exact: true }).waitFor({ state: 'visible', timeout: LIVE_MS });
  await page.getByText('typing…', { exact: true }).waitFor({ state: 'hidden', timeout: LIVE_MS });

  await page.getByRole('textbox', { name: 'Write to David' }).fill('Ok');
  await expect
    .poll(async () => (await requests(baseUrl)).bodies['WS typing @B'], { timeout: LIVE_MS })
    .toBe('{"counterpartId":3,"active":true}');
});

test('a voice note is recorded, sent to Argus by its id, and plays from its bubble', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await second.context.addInitScript(syntheticMicrophone);
  await chatScript(baseUrl, { reply: 'Noted.', delayMs: 300 });
  await open(baseUrl, second, '/conversations/0');
  const page = second.page;

  await page.getByRole('button', { name: 'Record a voice note' }).click();
  await page
    .getByRole('status', { name: /^Recording, / })
    .waitFor({ state: 'visible', timeout: LIVE_MS });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Send the voice note' }).click();

  await expect
    .poll(async () => (await requests(baseUrl)).requests, { timeout: LIVE_MS })
    .toContain('POST /conversation/0/voice-note @B');
  await expect
    .poll(async () => (await requests(baseUrl)).bodies['WS voice:text @B'] ?? '', {
      timeout: LIVE_MS,
    })
    .toMatch(/"noteId":"[0-9a-f]{32}"/);
  await page.getByText('Noted.', { exact: true }).waitFor({ state: 'visible', timeout: LIVE_MS });
  const play = page.getByRole('button', { name: /^Play the voice note/ });
  await play.click();
  await expect
    .poll(
      async () =>
        (await requests(baseUrl)).requests.some((line) =>
          /voice-note\/note-[0-9a-f]{32}\/content/.test(line)
        ),
      { timeout: LIVE_MS }
    )
    .toBe(true);
  await page
    .getByText('Nota de prueba para Argus', { exact: true })
    .waitFor({ state: 'visible', timeout: LIVE_MS });
});

test('opening a thread from the list paints its bubbles on the first frame', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(
    baseUrl,
    'conversation_message',
    message(1, {
      counterpartId: 3,
      counterpartName: 'David',
      kind: 'relay',
      body: 'First line',
      state: 'received',
    })
  );
  await store(
    baseUrl,
    'conversation_message',
    message(2, {
      counterpartId: 3,
      counterpartName: 'David',
      direction: 'out',
      kind: 'relay',
      body: 'Second line',
      receipt: 'read',
    })
  );
  await second.page.setViewportSize({ width: 412, height: 915 });
  await second.open('/conversations');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  const page = second.page;
  const row = page.getByRole('button', { name: /^David\. / });
  await row.waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const probe = window as unknown as { firstBubble?: number };
    let frames = 0;
    const tick = () => {
      if (
        [...document.querySelectorAll('[aria-label]')].some((node) =>
          node.getAttribute('aria-label')?.startsWith('Second line. ')
        )
      ) {
        probe.firstBubble = frames;
        return;
      }
      frames += 1;
      requestAnimationFrame(tick);
    };
    window.addEventListener('click', () => requestAnimationFrame(tick), {
      once: true,
      capture: true,
    });
  });
  await row.click();
  await expect
    .poll(
      () =>
        page.evaluate(() => (window as unknown as { firstBubble?: number }).firstBubble ?? null),
      { timeout: LIVE_MS }
    )
    .not.toBeNull();
  const frames = await page.evaluate(
    () => (window as unknown as { firstBubble?: number }).firstBubble ?? -1
  );
  if (process.env.ARGUS_E2E_TIMINGS)
    appendFileSync(process.env.ARGUS_E2E_TIMINGS, `thread-first-bubble-frames ${frames}\n`);
  expect(frames).toBeLessThanOrEqual(1);
});
