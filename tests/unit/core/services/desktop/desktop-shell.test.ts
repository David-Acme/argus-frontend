import { beforeEach, describe, expect, mock, test } from 'bun:test';

type Call = { command: string; args: unknown };

const calls: Call[] = [];
let answer: unknown = null;
let failure: string | null = null;

mock.module('@tauri-apps/api/core', () => ({
  invoke: async (command: string, args?: unknown) => {
    calls.push({ command, args });
    if (failure !== null) throw new Error(failure);
    return answer;
  },
}));

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async () => null,
    setStringAsync: async () => undefined,
    deleteAsync: async () => undefined,
    hasAsync: async () => false,
  },
}));

const { readAutostart, writeAutostart } = await import('@/core/services/desktop/desktop-shell');

beforeEach(() => {
  calls.length = 0;
  answer = null;
  failure = null;
});

describe('desktop shell autostart', () => {
  test('reads the login item the shell reports, off unless it is on', async () => {
    answer = false;
    expect(await readAutostart()).toBe(false);
    answer = true;
    expect(await readAutostart()).toBe(true);
    expect(calls).toEqual([
      { command: 'argus_autostart_get', args: undefined },
      { command: 'argus_autostart_get', args: undefined },
    ]);
  });

  test('turning autostart on or off is one explicit command with the chosen state', async () => {
    await writeAutostart(true);
    await writeAutostart(false);
    expect(calls).toEqual([
      { command: 'argus_autostart_set', args: { enabled: true } },
      { command: 'argus_autostart_set', args: { enabled: false } },
    ]);
  });

  test('a refused login item surfaces its code and message', async () => {
    failure = 'AUTOSTART_ERROR|the desktop entry could not be written';
    let thrown: unknown = null;
    try {
      await writeAutostart(true);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toEqual({ code: 'AUTOSTART_ERROR', message: 'the desktop entry could not be written' });
  });
});
