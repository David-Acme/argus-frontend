import { connected, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const camera = (id: number, name: string, patch: Record<string, unknown>) => ({
  id,
  name,
  driver: 'tapo',
  icon: 'video',
  manufacturer: 'TP-Link',
  model: 'C210',
  ip: `192.168.1.${50 + id}`,
  port: 554,
  username: 'admin',
  cloudUsername: 'ana@example.com',
  recordMode: 'events',
  privacyState: 'off',
  privacyObeyed: false,
  watchman: true,
  noAudio: false,
  retentionDays: 30,
  capabilities: ['ptz', 'presets', 'talk', 'privacy'],
  config: { catalogId: 'tapo-c210', streamPath: '', subStreamPath: '', homePreset: '1', activeLook: false, followIntruders: false, noAimSectors: [], retentionIncident: false },
  isEnabled: true,
  isOnline: true,
  createdAt: at + id,
  updatedAt: at + id,
  ...patch,
});

const PRIVACY_REASON = 'In privacy mode Argus neither sees nor hears this camera, so you cannot talk through it or move it.';

test('a camera in privacy mode offers neither talk nor movement, and says why', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'camera', camera(7, 'Dormitorio', { privacyState: 'on' }));
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await app.open('/cameras');
  await expect(screen.getByRole('button', 'Dormitorio, Private')).toBeVisible({ timeout: 10000 });
  await expect(screen.getByRole('button', 'Talk through Dormitorio')).toBeHidden();
  await screen.getByRole('button', 'Dormitorio, Private').click();
  await expect(screen.getByText(PRIVACY_REASON, { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('Move', { exact: true })).toBeHidden();
  await expect(screen.getByRole('switch', 'Listen on this camera')).toBeDisabled();

  expect(escapes).toEqual([]);
});
