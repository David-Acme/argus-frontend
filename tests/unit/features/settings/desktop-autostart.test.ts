import { describe, expect, test } from 'bun:test';
import { asNetError, commitAutostart, showsDesktopAutostart } from '@/features/settings/model/desktop-autostart';

describe('desktop autostart toggle', () => {
  test('a saved change keeps the chosen state and reports no error', async () => {
    const written: boolean[] = [];
    const outcome = await commitAutostart(true, async (enabled) => {
      written.push(enabled);
    });
    expect(outcome).toEqual({ enabled: true, error: null });
    expect(written).toEqual([true]);
  });

  test('a refused change reverts the switch to its previous state and keeps the code', async () => {
    const outcome = await commitAutostart(false, async () => {
      throw { code: 'STORAGE_ERROR', message: 'the desktop entry could not be removed' };
    });
    expect(outcome).toEqual({
      enabled: true,
      error: { code: 'STORAGE_ERROR', message: 'the desktop entry could not be removed' },
    });
  });

  test('a failure that is not a net error falls back to a network error', async () => {
    const outcome = await commitAutostart(true, async () => {
      throw new Error('bridge gone');
    });
    expect(outcome).toEqual({ enabled: false, error: { code: 'DESKTOP_SHELL_ERROR', message: '' } });
  });

  test('a net error passes through unchanged and anything else is a network error', () => {
    expect(asNetError({ code: 'TIMEOUT', message: 'slow' })).toEqual({ code: 'TIMEOUT', message: 'slow' });
    expect(asNetError('oops')).toEqual({ code: 'DESKTOP_SHELL_ERROR', message: '' });
    expect(asNetError(null)).toEqual({ code: 'DESKTOP_SHELL_ERROR', message: '' });
  });

  test('the row is shown only in the Tauri desktop shell, so mobile and web never render it', () => {
    expect(showsDesktopAutostart({ isTauri: false })).toBe(false);
    expect(showsDesktopAutostart({ isTauri: true })).toBe(true);
  });
});
