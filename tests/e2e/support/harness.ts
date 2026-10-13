import type { Page } from 'playwright-core';

export const NOT_LOOPBACK = /^(?!https?:\/\/127\.0\.0\.1[:/])[a-z]+:\/\//;

export type Visibility = 'hidden' | 'visible';

export const control = async (baseUrl: string, path: string): Promise<unknown> => {
  const response = await fetch(new URL(`/__e2e/${path}`, baseUrl));
  if (!response.ok) throw new Error(`the e2e backend refused ${path}: ${response.status}`);
  return response.json();
};

export const connected = async (baseUrl: string, device: string): Promise<number> =>
  ((await control(baseUrl, `connected?device=${device}`)) as { connected: number }).connected;

export const projectNames = async (baseUrl: string): Promise<string[]> =>
  ((await control(baseUrl, 'rows?table=project')) as { rows: { name: string }[] }).rows.map((row) => row.name);

export const setVisibility = (page: Page, state: Visibility): Promise<void> =>
  page.evaluate((next) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => next });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => next === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);

export const projectRows = (page: Page, name: string): Promise<number> =>
  page.getByRole('button', { name: new RegExp(`^${name}, `) }).count();
