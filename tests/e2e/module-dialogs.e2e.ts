import type { RouteSpec } from './support/fake-argus';
import { connected, patchContext, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const text = (es: string, en: string) => ({ es, en });

const detailed = (id: string, name: { es: string; en: string }, kind: string, hasData: boolean) => ({
  id,
  name,
  summary: text('', ''),
  kind,
  intro: null,
  roles: [],
  lifecycle: 'active',
  enabled: true,
  hasData,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 1000,
  installedBytes: 1000,
  hardware: null,
  job: null,
  gettingStarted: [],
  components: [],
});

const catalog = [
  detailed('core', text('Asistente y hogar', 'Assistant and home'), 'core', false),
  detailed('productivity', text('Productividad', 'Productivity'), 'available', true),
];

const dialogRoutes: RouteSpec[] = [
  {
    method: 'GET',
    path: '/modules/productivity/impact',
    info: {
      moduleId: 'productivity',
      action: 'uninstall',
      allowed: true,
      refusal: null,
      stops: [],
      keepsRunning: [],
      unreachable: [],
      roleMoves: [],
      roleHolders: [],
      data: [
        {
          owner: 'productivity',
          reachable: true,
          reported: true,
          items: [
            { kind: 'project', count: 3 },
            { kind: 'project_task', count: 12 },
          ],
          bytes: 2048,
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/modules/productivity/uninstall',
    status: 202,
    info: { id: '9', kind: 'purge', state: 'queued', progress: 0, bytesDone: 0, bytesTotal: 0, bytesPerSecond: 0, etaSeconds: null, reason: null, owner: null, roleMoves: [], roleMovesNote: null },
  },
];

test('uninstalling a module that holds data keeps it by default and deletes it only after its name is typed', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await patchContext(baseUrl, { ownerCatalog: catalog });
  await routes(baseUrl, dialogRoutes);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Settings').first().click();
  await screen.getByRole('button', 'Modules. Choose what Argus does and follow each installation.').click();
  await screen.getByRole('button', 'Uninstall: Productivity').click();

  await expect(screen.getByText('15 items', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('Keep my data', { exact: true })).toBeVisible();
  await expect(screen.getByText('Delete for good', { exact: true })).toBeHidden();

  await expect(screen.getByText('Your data is kept.', { exact: true })).toBeVisible();
  await screen.getByText('Delete my data too', { exact: true }).click();
  await expect(screen.getByText(/This cannot be undone/)).toBeVisible();
  await expect(screen.getByText('Your data is kept.', { exact: true })).toBeHidden();
  await expect(screen.getByText('Your data is deleted for good.', { exact: true })).toBeVisible();
  const field = browser.locator('[role="dialog"] input').last();
  const requests = async (): Promise<string[]> =>
    ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[] }).requests;

  const deleteDisabled = (): Promise<boolean> =>
    browser.evaluate(() => {
      const button = [...document.querySelectorAll('[role="dialog"] [role="button"], [role="dialog"] button')].find(
        (candidate) => candidate.textContent?.trim() === 'Delete for good'
      );
      return button?.getAttribute('aria-disabled') === 'true' || (button as HTMLButtonElement | undefined)?.disabled === true;
    });

  await expect.poll(deleteDisabled).toBe(true);
  await field.fill('Productivit');
  await expect.poll(deleteDisabled).toBe(true);
  await field.fill('  productivity ');
  await expect.poll(deleteDisabled).toBe(false);
  await screen.getByText('Delete for good', { exact: true }).click();
  await expect.poll(requests).toContain('POST /modules/productivity/uninstall @A');
  const sent = ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { bodies: Record<string, string> }).bodies;
  expect(JSON.parse(sent['POST /modules/productivity/uninstall @A'] ?? '{}')).toEqual({ keepData: false });

  expect(escapes).toEqual([]);
});
