import type { NetError, NetErrorCode } from '@/core/types';

export const showsDesktopAutostart = (platform: { isTauri: boolean }): boolean => platform.isTauri;

export type AutostartOutcome = {
  enabled: boolean;
  error: NetError | null;
};

const FALLBACK_CODE: NetErrorCode = 'DESKTOP_SHELL_ERROR';

const isNetError = (value: unknown): value is NetError =>
  typeof value === 'object' && value !== null && 'code' in value && 'message' in value;

export function asNetError(error: unknown): NetError {
  return isNetError(error) ? error : { code: FALLBACK_CODE, message: '' };
}

export async function commitAutostart(
  next: boolean,
  write: (enabled: boolean) => Promise<void>
): Promise<AutostartOutcome> {
  try {
    await write(next);
    return { enabled: next, error: null };
  } catch (error) {
    return { enabled: !next, error: asNetError(error) };
  }
}
