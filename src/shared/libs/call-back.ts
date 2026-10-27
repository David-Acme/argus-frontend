import { ASSISTANT_CALL_HREF } from '@/shared/constants';

export type ReminderLinkInput = {
  category?: unknown;
  urgency?: unknown;
  reminderId?: unknown;
};

export const CALL_BACK_PURPOSE = 'call_back';

export function callReminderIdOf({
  category,
  urgency,
  reminderId,
}: ReminderLinkInput): number | null {
  if (category !== 'reminder' || urgency === 'critical') return null;
  return typeof reminderId === 'number' && Number.isInteger(reminderId) && reminderId > 0
    ? reminderId
    : null;
}

export function callBackHref(reminderId: number | null): string {
  if (reminderId === null) return ASSISTANT_CALL_HREF;
  return `${ASSISTANT_CALL_HREF}?purpose=${CALL_BACK_PURPOSE}&reminderId=${reminderId}`;
}

export const callBackHrefOf = (data: ReminderLinkInput): string =>
  callBackHref(callReminderIdOf(data));
