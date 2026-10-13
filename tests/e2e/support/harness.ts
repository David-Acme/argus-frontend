import type { DeviceFrame, RouteSpec } from './fake-argus';
import type { Page } from 'playwright-core';

export const NOT_LOOPBACK = /^(?!https?:\/\/127\.0\.0\.1[:/])[a-z]+:\/\//;

export type Visibility = 'hidden' | 'visible';

export const control = async (baseUrl: string, path: string): Promise<unknown> => {
  const response = await fetch(new URL(`/__e2e/${path}`, baseUrl));
  if (!response.ok) throw new Error(`the e2e backend refused ${path}: ${response.status}`);
  return response.json();
};

export const post = async (baseUrl: string, path: string, body: unknown): Promise<void> => {
  const response = await fetch(new URL(`/__e2e/${path}`, baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`the e2e backend refused ${path}: ${response.status}`);
};

export const routes = (baseUrl: string, specs: readonly RouteSpec[]): Promise<void> => post(baseUrl, 'routes', specs);

export const emit = (baseUrl: string, frames: readonly DeviceFrame[]): Promise<void> => post(baseUrl, 'emit', frames);

export const store = (baseUrl: string, table: string, row: Record<string, unknown>): Promise<void> =>
  post(baseUrl, `store?table=${table}`, row);

export const patchContext = (baseUrl: string, patch: Record<string, unknown>): Promise<void> => post(baseUrl, 'context', patch);

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
