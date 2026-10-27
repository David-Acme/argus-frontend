import { unpairedDevice } from './support/seed';
import { expect, openFirst, test } from './support/devices';

test('the first screen greets still, and pairing on a network that hides Argus opens the address', async ({
  app,
  browser,
  screen,
}) => {
  const escapes = await openFirst(browser, app, unpairedDevice('A'));

  await expect(screen.getByRole('heading', 'Hi, I am Argus')).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('Everything stays in your home', { exact: true })).toBeVisible();
  await expect(screen.getByText('I have an invitation', { exact: true })).toBeHidden();

  await screen.getByText('Get started', { exact: true }).click();
  await expect(screen.getByRole('heading', 'I cannot find Argus on your network')).toBeVisible({
    timeout: 10000,
  });
  const search = screen.getByRole('button', 'Look at that address');
  await expect(search).toBeDisabled();
  await screen.getByRole('textbox', 'Argus address').fill('192.168.1.20');
  await screen.getByRole('textbox', 'Link code').fill('A1B2C3D4');
  await expect(search).toBeEnabled();

  await search.click();
  await expect(screen.getByText(/I could not reach your Argus/)).toBeVisible({ timeout: 10000 });

  await screen.getByText('Search my network again', { exact: true }).click();
  await expect(screen.getByRole('heading', 'I cannot find Argus on your network')).toBeVisible({
    timeout: 10000,
  });

  expect(escapes).toEqual([]);
});
