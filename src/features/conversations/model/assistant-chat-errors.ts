import type { TranslateFn } from '@/core/types';

const CODE = /^[A-Z][A-Z0-9_]*$/;

export function chatErrorCode(error: string | null): string {
  const head = error?.split('|')[0]?.trim() ?? '';
  return CODE.test(head) ? head : '';
}

export function chatErrorMessage(error: string | null, t: TranslateFn): string {
  const code = chatErrorCode(error);
  if (code === 'SOCKET_UNAVAILABLE' || code === 'SOCKET_LOST')
    return t('screens.conversations.chat.errors.connection');
  if (code === 'CALL_ACTIVE') return t('screens.conversations.chat.errors.call-active');
  if (code === 'CHAT_INTERRUPTED') return t('screens.conversations.chat.errors.interrupted');
  if (code === 'CHAT_TIMEOUT') return t('screens.conversations.chat.errors.timeout');
  if (code === 'TOO_MANY_REQUESTS' || code === 'RATE_LIMITED')
    return t('screens.conversations.chat.errors.too-many');
  if (code === 'SESSION_REVOKED' || code === 'ACCOUNT_DISABLED')
    return t('screens.conversations.chat.errors.session');
  return t('screens.conversations.chat.errors.generic');
}
