import { useRouter } from 'expo-router';
import type { DashboardSummary, TranslationKey } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useSurfaces } from '@/shared/libs/surfaces';
import type { CommandGroup, CommandInk, CommandItem } from '@/shared/ui/command';
import type { IconGlyph } from '@/shared/ui/icon';
import { useCommandResults } from '@/features/command/hooks/use-command-results';
import {
  commandAccess,
  entryHref,
  type CommandAccess,
} from '@/features/command/model/command-access';
import { whenLabel } from '@/features/command/model/command-entries';
import {
  searchGroups,
  type SearchEntry,
  type SearchGroup,
  type SearchKind,
  type SearchScopeKey,
} from '@/features/command/model/command-search';

export type CommandSearchInput = {
  query: string;
  scope: SearchScopeKey;
  openedAt: number;
  enabled?: boolean;
};

export type CommandSearchState = {
  access: CommandAccess;
  groups: readonly SearchGroup[];
  scope: SearchScopeKey;
  results: readonly CommandGroup[];
  paging: InfiniteListState;
  pending: boolean;
};

const KIND_LOOK: Readonly<Record<SearchKind, { icon: IconGlyph; ink: CommandInk }>> = {
  event: { icon: 'cal', ink: 'agenda' },
  task: { icon: 'check', ink: 'ok' },
  project: { icon: 'grid', ink: 'project' },
  person: { icon: 'user', ink: 'person' },
  camera: { icon: 'cam', ink: 'neutral' },
};

export const SEARCH_GROUP_TITLES = {
  agenda: 'screens.command.group-agenda',
  projects: 'screens.command.group-projects',
  people: 'screens.command.group-people',
  cameras: 'screens.command.group-cameras',
} as const satisfies Record<SearchGroup, TranslationKey>;

const KIND_LABELS = {
  event: 'screens.command.kind-event',
  task: 'screens.command.kind-task',
  project: 'screens.command.kind-project',
  person: 'screens.command.kind-person',
  camera: 'screens.command.kind-camera',
} as const satisfies Record<SearchKind, TranslationKey>;

function useHasProjects(): boolean {
  const summary = useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary);
  return (summary?.projectsTotal ?? 0) > 0;
}

function useEntryItem(openedAt: number, access: CommandAccess) {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const metaOf = (entry: SearchEntry): string => {
    const kind = t(KIND_LABELS[entry.kind]);
    if (entry.at === null) return kind;
    const when = whenLabel({ at: entry.at, allDay: entry.allDay, now: openedAt, date, t });
    return t('screens.command.kind-when', { kind, when });
  };
  return (entry: SearchEntry): CommandItem => ({
    id: `${entry.kind}:${entry.id}`,
    label: entry.title,
    meta: metaOf(entry),
    ...KIND_LOOK[entry.kind],
    onRun: () => router.push(entryHref(entry, access)),
  });
}

export function useCommandSearch({
  query,
  scope,
  openedAt,
  enabled = true,
}: CommandSearchInput): CommandSearchState {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const access = commandAccess(useAccessView(), useHasProjects(), useSurfaces());
  const groups = searchGroups(access.search);
  const current = scope === 'all' || groups.includes(scope) ? scope : 'all';
  const entryItem = useEntryItem(openedAt, access);
  const found = useCommandResults({
    query,
    scope: current,
    allowed: access.search,
    enabled,
    openedAt,
    since: date.startOfDay(new Date(openedAt)).getTime(),
  });
  return {
    access,
    groups,
    scope: current,
    results: found.matches.map(({ group, entries }) => ({
      title: t(SEARCH_GROUP_TITLES[group]),
      items: entries.map(entryItem),
    })),
    paging: found.paging,
    pending: found.pending,
  };
}
