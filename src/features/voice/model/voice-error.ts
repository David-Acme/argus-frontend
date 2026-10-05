import type { TranslateFn } from '@/core/types';

export function voiceErrorMessage(error: string | null, t: TranslateFn): string {
  const code = error?.split('|')[0] ?? '';
  if (code === 'MIC_PERMISSION_DENIED') return t('screens.voice.errors.permission-denied');
  if (code === 'SOCKET_UNAVAILABLE' || code === 'SOCKET_LOST')
    return t('screens.voice.errors.connection');
  if (code === 'CALL_TAKEN') return t('screens.voice.errors.call-taken');
  if (code === 'CALL_EXPIRED' || code === 'CALL_NOT_FOUND')
    return t('screens.voice.errors.call-missed');
  if (code === 'SESSION_REVOKED') return t('screens.voice.errors.session-revoked');
  if (code === 'ACCOUNT_DISABLED') return t('screens.voice.errors.account-disabled');
  return t('screens.voice.errors.generic');
}
