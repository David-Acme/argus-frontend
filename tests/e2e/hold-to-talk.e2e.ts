import { chromium, type BrowserContext, type Locator, type Page } from 'playwright-core';
import { cdpEndpoint } from './support/chromium';
import { NOT_LOOPBACK, connected, control, emit, routes } from './support/harness';
import { installTauriShim } from './support/tauri-shim';
import { ownerDevice } from './support/seed';
import { expect, test } from './support/devices';

const PHONE = { width: 360, height: 760 };

const HINT = 'Argus: toca para escribir, mantén para hablar';

const LISTENING = 'Te escucho… suelta para enviar';

const HOLD_MS = 600;

const NO_RTC = [
  {
    method: 'POST',
    path: '/rtc/token',
    status: 503,
    errors: { code: 'RTC_UNAVAILABLE', message: 'no realtime calls here' },
  },
];

type Phone = { page: Page; context: BrowserContext; close: () => Promise<void> };

const voiceFrame = (type: string, payload: unknown) => ({ device: 'A', frame: { type, payload } });

function fakeMicrophone(): void {
  const capture = async (): Promise<MediaStream> => {
    const context = new AudioContext();
    const tone = context.createOscillator();
    const sink = context.createMediaStreamDestination();
    tone.connect(sink);
    tone.start();
    return sink.stream;
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: capture,
      enumerateDevices: async () => [],
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  });
}

async function openPhone(baseUrl: string): Promise<Phone> {
  await control(baseUrl, 'reset');
  await routes(baseUrl, NO_RTC);
  const connection = await chromium.connectOverCDP(await cdpEndpoint());
  const context = await connection.newContext({ viewport: PHONE });
  await context.route(NOT_LOOPBACK, (route) => route.abort());
  const owner = ownerDevice('A');
  await context.addInitScript(installTauriShim, {
    ...owner,
    local: { ...owner.local, 'argus-storage:app.language': 'es' },
  });
  await context.addInitScript(fakeMicrophone);
  const page = await context.newPage();
  await page.goto(new URL('/', baseUrl).toString());
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  return {
    page,
    context,
    close: async () => {
      await context.close();
      await connection.close();
    },
  };
}

async function holdDown(page: Page, tab: Locator): Promise<{ x: number; y: number }> {
  const box = await tab.boundingBox();
  if (!box) throw new Error('the Argus tab has no box');
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  return centre;
}

const shown = (target: Locator, timeout = 5000): Promise<void> =>
  expect.poll(() => target.isVisible(), { timeout }).toBe(true);

const gone = (target: Locator, timeout = 5000): Promise<void> =>
  expect.poll(() => target.isVisible(), { timeout }).toBe(false);

const argusTab = (page: Page): Locator => page.getByRole('tab', { name: HINT, exact: true });

const centreTabShown = async (page: Page): Promise<boolean> => {
  await page.waitForTimeout(1500);
  return (await argusTab(page).count()) > 0;
};

test('holding the centre tab listens, the release sends, the answer card opens the thread', async ({
  app,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const phone = await openPhone(baseUrl);
  try {
    const { page } = phone;
    test.skip(!(await centreTabShown(page)), 'the centre tab arrives with the navigation track');

    await holdDown(page, argusTab(page));
    await shown(page.getByText(LISTENING, { exact: true }));
    expect(await page.evaluate(() => document.body.innerText.includes('Conectando'))).toBe(false);

    await emit(baseUrl, [
      voiceFrame('voice:stt', { text: 'pon la casa en modo noche', final: false }),
    ]);
    await shown(page.getByText('«pon la casa en modo noche»', { exact: true }));

    await page.mouse.up();
    await gone(page.getByText(LISTENING, { exact: true }));
    await shown(page.getByRole('status', { name: 'Pensando…' }));

    await emit(baseUrl, [
      voiceFrame('voice:stt', { text: 'pon la casa en modo noche', final: true }),
      voiceFrame('voice:action', { id: 9, name: 'app.open', arguments: { screen: 'agenda' } }),
      voiceFrame('voice:assistant', { text: 'Listo, te abrí la agenda.' }),
    ]);
    const answer = page.getByRole('button', {
      name: 'Listo, te abrí la agenda. Ver la conversación',
      exact: true,
    });
    await shown(answer, 10000);
    await shown(page.getByText('Abrir Agenda', { exact: true }));

    await answer.click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10000 })
      .toBe('/conversations/0');
    await gone(answer);
  } finally {
    await phone.close();
  }
});

test('sliding off the centre tab cancels: no answer card and the cap goes away', async ({
  app,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const phone = await openPhone(baseUrl);
  try {
    const { page } = phone;
    test.skip(!(await centreTabShown(page)), 'the centre tab arrives with the navigation track');

    const centre = await holdDown(page, argusTab(page));
    await shown(page.getByText(LISTENING, { exact: true }));
    await page.mouse.move(centre.x, centre.y - 200, { steps: 8 });
    await page.mouse.up();

    await gone(page.getByText(LISTENING, { exact: true }));
    await emit(baseUrl, [
      voiceFrame('voice:stt', { text: 'olvídalo', final: true }),
      voiceFrame('voice:assistant', { text: 'No debería verse.' }),
    ]);
    await page.waitForTimeout(1500);
    expect(await page.getByRole('status', { name: 'Pensando…' }).count()).toBe(0);
    expect(await page.evaluate(() => document.body.innerText.includes('No debería verse.'))).toBe(
      false
    );
    expect(new URL(page.url()).pathname).toBe('/');
  } finally {
    await phone.close();
  }
});

test('a release Argus never hears ends in the not-heard card, and an outside tap closes it', async ({
  app,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const phone = await openPhone(baseUrl);
  try {
    const { page } = phone;
    test.skip(!(await centreTabShown(page)), 'the centre tab arrives with the navigation track');

    await holdDown(page, argusTab(page));
    await page.mouse.up();
    await shown(page.getByText('No te escuché.', { exact: true }), 10000);
    await shown(page.getByText('Mantén pulsado Argus mientras hablas.', { exact: true }));

    await page.mouse.click(PHONE.width / 2, 120);
    await gone(page.getByText('No te escuché.', { exact: true }));
  } finally {
    await phone.close();
  }
});
