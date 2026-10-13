import { controls, unnamed } from './support/accessibility';
import { connected, routes, store } from './support/harness';
import { populated, seededProject } from './support/screens';
import { expect, test } from './support/devices';

test('the project dialog names every field by its visible label', async ({ app, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await second.open();
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await second.page.getByRole('button', { name: 'Projects', exact: true }).first().click();
  await second.page.getByRole('button', { name: 'New project' }).first().click();
  await expect.poll(async () => (await controls(second.page)).some((control) => control.role === 'textbox'), { timeout: 10000 }).toBe(true);

  const named = (await controls(second.page)).map((control) => `${control.role}: ${control.name}`);
  expect(named).toContain('textbox: Name');
  expect(named).toContain('textbox: Description');
  expect(named.some((control) => control.includes('Status'))).toBe(true);
  expect(await unnamed(second.page)).toEqual([]);
});

type Visit = { name: string; go: (page: import('playwright-core').Page) => Promise<void> };

const click = (name: string, exact = true) => async (page: import('playwright-core').Page) => {
  await page.getByRole('button', { name, exact }).first().click();
  await page.waitForTimeout(800);
};

const SAME_PURPOSE = new Set(['projects: button: New project']);

const VISITS: Visit[] = [
  { name: 'home', go: async (page) => page.waitForTimeout(800) },
  { name: 'projects', go: click('Projects') },
  { name: 'security', go: async (page) => {
    await click('Home')(page);
    await click('Open security')(page);
  } },
  { name: 'environment', go: click('Open Casa') },
  { name: 'people', go: click('People') },
  { name: 'profile', go: click('Profile') },
  { name: 'settings', go: click('Settings') },
  { name: 'activity', go: click('Activity history. Changes in your home and its modules, with filters.') },
  { name: 'modules', go: async (page) => {
    await click('Settings')(page);
    await click('Modules. Choose what Argus does and follow each installation.')(page);
  } },
];

test('every control on the section-2 screens has a name, and no two different controls share one', async ({ app, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, populated);
  await store(baseUrl, 'project', seededProject);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => second.page.getByRole('heading', { name: 'Welcome, Ana' }).count(), { timeout: 10000 }).toBe(1);

  const missing: string[] = [];
  const repeated: string[] = [];
  for (const visit of VISITS) {
    await visit.go(second.page);
    for (const control of await unnamed(second.page)) missing.push(`${visit.name}: ${control.role}`);
    const seen = new Map<string, number>();
    for (const control of await controls(second.page)) {
      const key = `${control.role}: ${control.name}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count] of seen) {
      const where = `${visit.name}: ${key}`;
      if (count > 1 && !key.startsWith('radio:') && !SAME_PURPOSE.has(where)) repeated.push(`${where} x${count}`);
    }
  }
  expect(missing).toEqual([]);
  expect(repeated).toEqual([]);
});
