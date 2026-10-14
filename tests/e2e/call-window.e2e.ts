import { chromium, type Page } from 'playwright-core';
import { cdpEndpoint } from './support/chromium';
import { control, NOT_LOOPBACK } from './support/harness';
import { installCallIpc, type CallIpcCall, type CallIpcSeed } from './support/call-window-ipc';
import { expect, test } from './support/devices';

const CALL_ID = 'call-7';
const PHONE = { width: 340, height: 210 };

const openCallWindow = async (
  baseUrl: string,
  seed: CallIpcSeed,
  query: string
): Promise<{ page: Page; close: () => Promise<void> }> => {
  const connection = await chromium.connectOverCDP(await cdpEndpoint());
  const context = await connection.newContext({ viewport: PHONE });
  await context.route(NOT_LOOPBACK, (route) => route.abort());
  await context.addInitScript(installCallIpc, seed);
  const page = await context.newPage();
  await page.goto(new URL(`/call/index.html?${query}`, baseUrl).toString());
  return {
    page,
    close: async () => {
      await context.close();
      await connection.close();
    },
  };
};

const callsOf = (page: Page): Promise<CallIpcCall[]> =>
  page.evaluate(() => (window as unknown as { __argusCallIpc: { calls: () => CallIpcCall[] } }).__argusCallIpc.calls());

const NO_FAILURES: CallIpcSeed = { failures: {} };

test('answering asks the shell to answer that call, with no confirmation, and silences the ring', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  const callWindow = await openCallWindow(baseUrl, NO_FAILURES, `callId=${CALL_ID}`);
  try {
    await callWindow.page.getByRole('button', { name: 'Contestar' }).click();
    await expect.poll(() => callsOf(callWindow.page), { timeout: 10000 }).toEqual([
      { command: 'argus_call_answer', args: { callId: CALL_ID } },
    ]);
    await expect.poll(() => callWindow.page.evaluate(() => document.querySelector('audio')?.paused ?? false)).toBe(true);
  } finally {
    await callWindow.close();
  }
});

test('declining hands the decline to the main webview and waits for its result', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  const callWindow = await openCallWindow(baseUrl, NO_FAILURES, `callId=${CALL_ID}`);
  try {
    await callWindow.page.getByRole('button', { name: 'Rechazar' }).click();
    await expect.poll(() => callsOf(callWindow.page), { timeout: 10000 }).toEqual([
      { command: 'argus_call_decline', args: { callId: CALL_ID } },
    ]);
    await expect(callWindow.page.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    await expect(callWindow.page.getByRole('button', { name: 'Contestar' })).toBeDisabled();
  } finally {
    await callWindow.close();
  }
});

test('a decline the server refuses keeps the window and lets the owner try again', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  const callWindow = await openCallWindow(baseUrl, NO_FAILURES, `callId=${CALL_ID}`);
  try {
    await callWindow.page.getByRole('button', { name: 'Rechazar' }).click();
    await expect.poll(() => callsOf(callWindow.page), { timeout: 10000 }).toHaveLength(1);
    await callWindow.page.evaluate(() =>
      (window as unknown as { __argusCallIpc: { emit: (event: string) => void } }).__argusCallIpc.emit('argus-call-decline-failed')
    );
    await expect.poll(() => callWindow.page.getByRole('status').textContent(), { timeout: 10000 }).toContain('No se pudo rechazar');
    await expect(callWindow.page.getByRole('button', { name: 'Rechazar' })).toBeEnabled();
    await expect(callWindow.page.getByRole('button', { name: 'Contestar' })).toBeEnabled();
  } finally {
    await callWindow.close();
  }
});

test('a decline with the main webview gone says the call will close by itself', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  const callWindow = await openCallWindow(baseUrl, { failures: { argus_call_decline: 'MAIN_UNAVAILABLE|The main window is gone' } }, `callId=${CALL_ID}`);
  try {
    await callWindow.page.getByRole('button', { name: 'Rechazar' }).click();
    await expect.poll(() => callWindow.page.getByRole('status').textContent(), { timeout: 10000 }).toBe(
      'No se pudo rechazar; la llamada se cerrará sola'
    );
    await expect(callWindow.page.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
  } finally {
    await callWindow.close();
  }
});

test('a cancelled call silences the ring, offers no action and asks for nothing', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  const callWindow = await openCallWindow(baseUrl, NO_FAILURES, `callId=${CALL_ID}`);
  try {
    await callWindow.page.evaluate(() =>
      (window as unknown as { __argusCallIpc: { emit: (event: string) => void } }).__argusCallIpc.emit('argus-call-cancelled')
    );
    await expect(callWindow.page.getByRole('button', { name: 'Contestar' })).toBeDisabled();
    await expect(callWindow.page.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    await expect(callWindow.page.getByRole('status')).toHaveText('La llamada ya no está activa.');
    expect(await callsOf(callWindow.page)).toEqual([]);
  } finally {
    await callWindow.close();
  }
});

test('a window without a valid call id offers no action', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  const callWindow = await openCallWindow(baseUrl, NO_FAILURES, 'callId=..%2Fetc');
  try {
    await expect(callWindow.page.getByRole('status')).toHaveText('Llamada no válida.');
    await expect(callWindow.page.getByRole('button', { name: 'Contestar' })).toBeDisabled();
    expect(await callsOf(callWindow.page)).toEqual([]);
  } finally {
    await callWindow.close();
  }
});
