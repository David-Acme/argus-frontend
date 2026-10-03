import type { TranslateFn } from '@/core/types';

export function voiceErrorMessage(error: string | null, t: TranslateFn): string {
  const code = error?.split('|')[0] ?? '';
  if (code === 'MIC_PERMISSION_DENIED') return t('screens.voice.errors.permission-denied');
  if (code === 'SOCKET_UNAVAILABLE' || code === 'SOCKET_LOST') return t('screens.voice.errors.connection');
  return t('screens.voice.errors.generic');
}
