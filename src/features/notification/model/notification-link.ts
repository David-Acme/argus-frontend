import { validCounterpartId } from '@/core/services/conversation';

const IN_APP_PATH = /^\/(?!\/)[A-Za-z0-9/_-]{0,200}$/;

const HOUSEHOLD_MESSAGE_KIND = 'household_message';

function conversationHrefOf(data: Readonly<Record<string, unknown>>): string | null {
  if (data.kind !== HOUSEHOLD_MESSAGE_KIND) return null;
  const counterpartId =
    validCounterpartId(data.counterpartId) ?? validCounterpartId(data.fromUserId);
  return counterpartId === null ? null : `/conversations/${counterpartId}`;
}

export function notificationHrefOf(data: Readonly<Record<string, unknown>>): string {
  const conversation = conversationHrefOf(data);
  if (conversation !== null) return conversation;
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  return IN_APP_PATH.test(url) ? url : '/';
}
