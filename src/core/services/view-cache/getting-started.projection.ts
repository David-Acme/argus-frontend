import type { IChecklistSignalsCache } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type GettingStartedSignalsInput = {
  cameras: readonly unknown[];
  zones: readonly unknown[];
  events: number;
  projects: readonly unknown[];
  people: readonly unknown[];
  invitations: readonly unknown[];
};

export function projectGettingStarted(values: GettingStartedSignalsInput): ViewWrite[] {
  const signals: IChecklistSignalsCache = {
    cameras: values.cameras.length,
    zones: values.zones.length,
    events: values.events,
    projects: values.projects.length,
    people: values.people.length,
    invitations: values.invitations.length,
  };
  return [{ key: VIEW_CACHE_KEYS.gettingStartedSignals, value: signals }];
}
