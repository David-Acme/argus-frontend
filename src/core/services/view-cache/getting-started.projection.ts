import type { IChecklistSignalsCache } from '@/core/interfaces';
import { ARGUS_COUNTERPART_ID } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type GettingStartedSignalsInput = {
  cameras: readonly unknown[];
  zones: readonly unknown[];
  events: number;
  projects: readonly unknown[];
  people: readonly unknown[];
  invitations: readonly unknown[];
  conversations: readonly { counterpartId: string }[];
};

const ARGUS_THREAD = String(ARGUS_COUNTERPART_ID);

export function projectGettingStarted(values: GettingStartedSignalsInput): ViewWrite[] {
  const signals: IChecklistSignalsCache = {
    cameras: values.cameras.length,
    zones: values.zones.length,
    events: values.events,
    projects: values.projects.length,
    people: values.people.length,
    invitations: values.invitations.length,
    argusTalks: values.conversations.filter((message) => message.counterpartId === ARGUS_THREAD).length,
  };
  return [{ key: VIEW_CACHE_KEYS.gettingStartedSignals, value: signals }];
}
