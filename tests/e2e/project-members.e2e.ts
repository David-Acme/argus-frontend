import type { Page } from 'playwright-core';
import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const countButtons = (page: Page, name: string): Promise<number> =>
  page.getByRole('button', { name, exact: true }).count();

const project = (ownerId: number) => ({
  id: 900,
  ownerId,
  name: 'Huerto',
  description: '',
  status: 'active',
  color: 'blue',
  startsAt: null,
  targetAt: null,
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
});

const luis = {
  id: 2,
  name: 'Luis',
  lastName: 'Paz',
  role: 'resident',
  lang: 'es',
  isActive: true,
  createdAt: at,
  updatedAt: at,
};

const membership = {
  id: 77,
  projectId: 900,
  userId: 2,
  access: 'edit',
  createdAt: at + 1,
  updatedAt: at + 1,
  deletedAt: null,
};

const memberRoutes = [
  {
    method: 'POST',
    path: '/project-member',
    info: membership,
    emits: [{ frame: { operation: 4, option: 'project_member', info: membership } }],
  },
  {
    method: 'DELETE',
    path: '/project-member/77',
    info: { deleted: true, id: 77 },
    emits: [
      { frame: { operation: 5, option: 'project_member', info: { id: 77, deletedAt: at + 2 } } },
    ],
  },
];

test('the owner adds a member on one device, the other device shows it live, and a removal leaves both', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'user', luis);
  await store(baseUrl, 'project', project(1));
  await routes(baseUrl, memberRoutes);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Agenda').first().click();
  await screen.getByRole('tab', 'Projects').first().click();
  await second.page.getByRole('tab', { name: 'Agenda', exact: true }).first().click();
  await second.page.getByRole('tab', { name: 'Projects', exact: true }).first().click();
  await screen.getByRole('button', 'Members').click();
  await expect(screen.getByText('Only you work on this project for now.')).toBeVisible();

  await screen.getByText('Choose a person', { exact: true }).click();
  await screen.getByText('Luis Paz', { exact: true }).last().click();
  await screen.getByText('Can edit', { exact: true }).last().click();
  await screen.getByText('Add to the project', { exact: true }).click();

  const requests = async (): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
    (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as {
      requests: string[];
      bodies: Record<string, string>;
    };
  await expect.poll(async () => (await requests()).requests).toContain('POST /project-member @A');
  expect(JSON.parse((await requests()).bodies['POST /project-member @A'] ?? '{}')).toEqual({
    projectId: 900,
    userId: 2,
    access: 'edit',
  });
  await expect(screen.getByRole('button', 'Remove Luis Paz')).toBeVisible({ timeout: LIVE_MS });

  await second.page.getByRole('button', { name: 'Members' }).click();
  await expect
    .poll(() => countButtons(second.page, 'Remove Luis Paz'), { timeout: LIVE_MS })
    .toBe(1);

  await screen.getByRole('button', 'Remove Luis Paz').click();
  await screen.getByText('Delete', { exact: true }).last().click();
  await expect(screen.getByRole('button', 'Remove Luis Paz')).toBeHidden({ timeout: LIVE_MS });
  await expect
    .poll(() => countButtons(second.page, 'Remove Luis Paz'), { timeout: LIVE_MS })
    .toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a member who can only view sees the project without the controls that would change it', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'user', { ...luis, id: 9, name: 'Marta' });
  await store(baseUrl, 'project', project(9));
  await store(baseUrl, 'project_member', { ...membership, userId: 1, access: 'view' });
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Agenda').first().click();
  await screen.getByRole('tab', 'Projects').first().click();
  await expect(
    screen.getByText('You can view this project. Whoever created it decides who can edit it.')
  ).toBeVisible({
    timeout: 10000,
  });
  await expect(screen.getByRole('button', 'Members')).toBeHidden();
  await expect(screen.getByRole('button', 'Edit')).toBeHidden();
  await expect(screen.getByRole('button', 'New task')).toBeHidden();
  await expect(screen.getByRole('button', 'Add task to To do')).toBeHidden();

  expect(escapes).toEqual([]);
});
