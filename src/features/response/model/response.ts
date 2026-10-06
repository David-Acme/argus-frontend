import type { IncidentResponse, ResponseContact, ResponseVerdict } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { hasCapability, type AccessView } from '@/shared/libs/capabilities';

export type ResponseTone = 'urgent' | 'attended' | 'resolved' | 'confirmed';

export type ResponseHeadline =
  | { key: 'unanswered' }
  | { key: 'calling'; step: number; stepCount: number }
  | { key: 'attended-self' }
  | { key: 'attended'; name: string }
  | { key: 'confirmed'; name: string }
  | { key: 'confirmed-self' }
  | { key: 'false-alarm'; name: string }
  | { key: 'false-alarm-self' }
  | { key: 'expired' };

const OPEN_STATES = new Set<IncidentResponse['state']>(['active', 'attended', 'unanswered', 'confirmed']);

const CLOSED_VISIBLE_SECONDS = 15 * 60;

export function isOpen(response: IncidentResponse): boolean {
  return OPEN_STATES.has(response.state);
}

export function headlineOf(response: IncidentResponse, selfId: number): ResponseHeadline {
  switch (response.state) {
    case 'false_alarm':
      return response.verdictBy?.userId === selfId
        ? { key: 'false-alarm-self' }
        : { key: 'false-alarm', name: response.verdictBy?.name ?? '' };
    case 'confirmed':
      return response.verdictBy?.userId === selfId
        ? { key: 'confirmed-self' }
        : { key: 'confirmed', name: response.verdictBy?.name ?? '' };
    case 'expired':
      return { key: 'expired' };
    case 'unanswered':
      return { key: 'unanswered' };
    case 'attended':
      return response.attendedBy?.userId === selfId
        ? { key: 'attended-self' }
        : { key: 'attended', name: response.attendedBy?.name ?? '' };
    case 'active':
      return { key: 'calling', step: response.step + 1, stepCount: Math.max(1, response.stepCount) };
  }
}

export function toneOf(response: IncidentResponse): ResponseTone {
  if (response.state === 'false_alarm' || response.state === 'expired') return 'resolved';
  if (response.state === 'confirmed') return 'confirmed';
  if (response.state === 'attended') return 'attended';
  return 'urgent';
}

export function canDecide(response: IncidentResponse, verdict: ResponseVerdict): boolean {
  if (!response.mine?.reached) return false;
  if (verdict === 'real') return response.state !== 'false_alarm' && response.state !== 'expired' && response.state !== 'confirmed';
  return response.state !== 'false_alarm' && response.state !== 'expired';
}

export function contactsOf(response: IncidentResponse): ResponseContact[] {
  return response.showContacts ? response.contacts : [];
}

export function emergencyOf(response: IncidentResponse): string | null {
  return response.showContacts && response.emergencyNumber ? response.emergencyNumber : null;
}

export function placeOf(response: IncidentResponse): string {
  if (response.cameraName && response.environmentName) return `${response.cameraName} (${response.environmentName})`;
  return response.cameraName || response.environmentName;
}

export function mergeResponse(
  current: Readonly<Record<number, IncidentResponse>>,
  incoming: IncidentResponse
): Record<number, IncidentResponse> {
  const previous = current[incoming.id];
  if (previous && previous.updatedAt > incoming.updatedAt) return { ...current };
  return { ...current, [incoming.id]: incoming };
}

export function visibleResponses(
  responses: Readonly<Record<number, IncidentResponse>>,
  nowSeconds: number
): IncidentResponse[] {
  return Object.values(responses)
    .filter((response) => isOpen(response) || nowSeconds - response.updatedAt < CLOSED_VISIBLE_SECONDS)
    .sort((left, right) => Number(isOpen(right)) - Number(isOpen(left)) || right.createdAt - left.createdAt);
}

export const canRespond = (view: AccessView): boolean => hasCapability(view, CAPABILITY.safetyRespond);

export function alertsFor(
  view: AccessView,
  responses: Readonly<Record<number, IncidentResponse>>,
  nowSeconds: number
): IncidentResponse[] {
  return canRespond(view) ? visibleResponses(responses, nowSeconds) : [];
}

export function withVerdict(
  response: IncidentResponse,
  verdict: ResponseVerdict,
  self: { userId: number; name: string },
  nowSeconds: number
): IncidentResponse {
  const person = { userId: self.userId, name: self.name };
  return {
    ...response,
    state: verdict === 'real' ? 'confirmed' : 'false_alarm',
    verdict,
    verdictBy: person,
    verdictAt: nowSeconds,
    attendedBy: response.attendedBy ?? person,
    showContacts: verdict === 'real',
  };
}

export function phoneHref(phone: string, channel: 'tel' | 'sms'): string {
  return `${channel}:${phone.replace(/[^0-9+*#]/g, '')}`;
}
