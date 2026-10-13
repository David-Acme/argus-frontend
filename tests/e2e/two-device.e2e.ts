import { connected, control, projectNames, projectRows, setVisibility } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

const BACKGROUND_MS = 8000;

const unique = (label: string): string => `${label} ${Date.now().toString(36)}`;

test('a project created on one device appears on the other, live, after a background cycle and after a missed reconnect', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const escapes = await openFirst(browser, app);
  await second.open();

  const open = async (): Promise<void> => {
    await screen.getByRole('button', 'Projects').first().click();
    await expect(screen.getByRole('heading', 'Projects')).toBeVisible();
  };
  await open();
  await second.page.getByRole('button', { name: 'Projects' }).first().click();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  const create = async (name: string): Promise<number> => {
    await screen.getByRole('button', 'New project').first().click();
    await screen.getByPlaceholder('Move, renovation, trip…').fill(name);
    await screen.getByText('Save', { exact: true }).click();
    await expect.poll(() => projectNames(baseUrl), { timeout: 5000 }).toContain(name);
    return Date.now();
  };

  const live = unique('Mudanza');
  await create(live);
  await expect.poll(() => projectRows(second.page, live), { timeout: LIVE_MS }).toBe(1);

  await setVisibility(second.page, 'hidden');
  await control(baseUrl, 'refuse?device=B&ms=600000');
  await control(baseUrl, 'drop?device=B');
  const backgrounded = unique('Jardín');
  await create(backgrounded);
  await second.page.waitForTimeout(BACKGROUND_MS);
  await control(baseUrl, 'refuse?device=B&ms=0');
  await setVisibility(second.page, 'visible');
  await expect.poll(() => projectRows(second.page, backgrounded), { timeout: LIVE_MS }).toBe(1);

  await control(baseUrl, 'refuse?device=B&ms=3000');
  await control(baseUrl, 'drop?device=B');
  const missed = unique('Viaje');
  await create(missed);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 40000 }).toBe(1);
  await expect.poll(() => projectRows(second.page, missed), { timeout: LIVE_MS }).toBe(1);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
