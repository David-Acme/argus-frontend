import type { Page } from 'playwright-core';
import { connected, emit, routes, store } from './support/harness';
import { expect, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 5000;

const PALETTE = 'Search or ask Argus';

const reminder = {
  id: 701,
  createdBy: 1,
  targetUserId: 1,
  title: 'Water the plants',
  description: '',
  scheduledAt: at + 3600,
  recurrenceRule: null,
  isCompleted: false,
  completedAt: null,
  createdAt: at - 60,
  updatedAt: at - 60,
};

const pathname = (page: Page): Promise<string> => page.evaluate(() => location.pathname);

const requests = async (baseUrl: string): Promise<string[]> =>
  ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[] })
    .requests;

const titleCount = (page: Page): Promise<number> =>
  page.getByText(reminder.title, { exact: true }).count();

const optionCount = (page: Page, name: string): Promise<number> =>
  page.getByRole('option', { name, exact: true }).count();

test('asking Argus creates a reminder that rings; no reminder list exists in the app', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await store(baseUrl, 'reminder', reminder);
  await routes(baseUrl, [
    { method: 'POST', path: `/reminder/${reminder.id}/snooze`, info: { id: reminder.id } },
  ]);
  await second.open('/agenda');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await page.getByRole('button', { name: 'New event or task', exact: true }).waitFor();
  expect(await titleCount(page)).toBe(0);

  await second.open('/');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  expect(await titleCount(page)).toBe(0);
  const ask = 'Ask Argus to remind me “water the plants…”';
  await expect
    .poll(
      async () => {
        if ((await page.getByRole('dialog', { name: PALETTE }).count()) === 0)
          await page.keyboard.press('Control+k');
        await page.getByRole('combobox', { name: PALETTE }).fill('water the plants');
        return optionCount(page, ask);
      },
      { timeout: 15000 }
    )
    .toBe(1);
  expect(await optionCount(page, reminder.title)).toBe(0);
  await page.getByRole('option', { name: ask, exact: true }).click();
  await expect.poll(() => pathname(page), { timeout: LIVE_MS }).toBe('/conversations/0');
  await expect
    .poll(() => page.getByRole('textbox').first().inputValue(), { timeout: LIVE_MS })
    .toBe('Remind me water the plants');

  await emit(baseUrl, [
    {
      frame: {
        type: 'voice:result',
        payload: {
          id: 41,
          tool: 'memory.remind',
          ok: true,
          data: { title: reminder.title, remindAt: reminder.scheduledAt },
        },
      },
    },
  ]);
  await expect
    .poll(() => page.getByText('I will remind you', { exact: true }).count(), { timeout: LIVE_MS })
    .toBeGreaterThan(0);

  await emit(baseUrl, [
    {
      frame: {
        operation: 8,
        option: 'call',
        info: {
          callId: 'call-reminder-701',
          reason: reminder.title,
          subject: reminder.title,
          summary: '',
          urgency: 'time_sensitive',
          kind: 'agenda',
          category: 'reminder',
          reminderId: reminder.id,
          lang: 'en',
          expiresAt: at + 600,
        },
      },
    },
  ]);
  const snooze = page.getByRole('button', { name: 'In 10 min', exact: true });
  await expect.poll(() => snooze.count(), { timeout: LIVE_MS }).toBe(1);
  await snooze.click();
  await expect
    .poll(() => requests(baseUrl), { timeout: LIVE_MS })
    .toContain(`POST /reminder/${reminder.id}/snooze @B`);

  expect(second.escapes).toEqual([]);
});
