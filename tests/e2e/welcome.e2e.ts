import { unpairedDevice } from './support/seed';
import { expect, openFirst, test } from './support/devices';

const HERO = 'Argus greets you with its modules: Security, Productivity and Agronomy, coming soon.';

test('the first screen greets with one labeled hero and leads to pairing, which waits for a code', async ({ app, browser, screen }) => {
  const escapes = await openFirst(browser, app, unpairedDevice('A'));

  await expect(screen.getByRole('heading', 'Hi, I am Argus')).toBeVisible({ timeout: 10000 });
  await expect(screen.getByRole('button', HERO)).toBeVisible();
  await screen.getByRole('button', HERO).click();
  await expect(screen.getByRole('button', HERO)).toBeVisible();

  await screen.getByText('Get started', { exact: true }).click();
  await expect(screen.getByRole('heading', 'Link your server')).toBeVisible();
  const proceed = screen.getByRole('button', 'Continue');
  await expect(proceed).toBeDisabled();
  await screen.getByRole('textbox', 'Pairing code').fill('A1B2C3');
  await expect(proceed).toBeEnabled();

  expect(escapes).toEqual([]);
});
