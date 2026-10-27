import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { DashboardSummary, TranslationKey } from '@/core/types';
import { ASSISTANT_THREAD_HREF, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type {
  CommandGroup,
  CommandInk,
  CommandIntent,
  CommandItem,
  CommandScopes,
  CommandSource,
} from '@/shared/ui/command';
import type { IconGlyph } from '@/shared/ui/icon';
import { useAssistantChat } from '@/features/voice';
import { useCommandResults } from '@/features/command/hooks/use-command-results';
import {
  commandAccess,
  createHref,
  entryHref,
  type CommandAccess,
  type CreateKind,
  type SectionKey,
} from '@/features/command/model/command-access';
import { whenLabel } from '@/features/command/model/command-entries';
import {
  actionMatches,
  filterLabeled,
  searchGroups,
  type SearchEntry,
  type SearchGroup,
  type SearchKind,
  type SearchScopeKey,
} from '@/features/command/model/command-search';

export type CommandSourceInput = { intent: CommandIntent; openedAt: number; query: string };

export type CommandSourceState = {
  source: CommandSource;
  onAsk?: (query: string) => void;
};

const KIND_LOOK: Readonly<Record<SearchKind, { icon: IconGlyph; ink: CommandInk }>> = {
  event: { icon: 'cal', ink: 'agenda' },
  task: { icon: 'check', ink: 'ok' },
  project: { icon: 'grid', ink: 'project' },
  person: { icon: 'user', ink: 'person' },
  camera: { icon: 'cam', ink: 'neutral' },
};

const SECTION_ICONS: Readonly<Record<SectionKey, IconGlyph>> = {
  home: 'home',
  security: 'shield',
  argus: 'mic',
  agenda: 'cal',
  you: 'user',
};

const SECTION_LABELS = {
  home: 'screens.command.section-home',
  security: 'screens.command.section-security',
  argus: 'screens.command.section-argus',
  agenda: 'screens.command.section-agenda',
  you: 'screens.command.section-you',
} as const satisfies Record<SectionKey, TranslationKey>;

const GROUP_TITLES = {
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

const CREATE_LABELS = {
  reminder: 'screens.command.ask-reminder',
  event: 'screens.agenda.new-event',
  task: 'screens.projects.new-task',
  project: 'screens.projects.new-project',
} as const satisfies Record<CreateKind, TranslationKey>;

function useHasProjects(): boolean {
  const summary = useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary);
  return (summary?.projectsTotal ?? 0) > 0;
}

function useScopeChips(groups: readonly SearchGroup[], visible: boolean) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<SearchScopeKey>('all');
  const current = scope === 'all' || groups.includes(scope) ? scope : 'all';
  const scopes: CommandScopes | undefined =
    visible && groups.length > 1
      ? {
          options: [
            { key: 'all', label: t('screens.command.scope-all') },
            ...groups.map((group) => ({ key: group, label: t(GROUP_TITLES[group]) })),
          ],
          value: current,
          onChange: (key) => setScope(groups.find((group) => group === key) ?? 'all'),
        }
      : undefined;
  return { current, scopes };
}

function useEntryMeta(openedAt: number) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  return (entry: SearchEntry): string => {
    const kind = t(KIND_LABELS[entry.kind]);
    if (entry.at === null) return kind;
    const when = whenLabel({ at: entry.at, allDay: entry.allDay, now: openedAt, date, t });
    return t('screens.command.kind-when', { kind, when });
  };
}

function useSectionItems(sections: CommandAccess['sections']): CommandItem[] {
  const router = useRouter();
  const { t } = useTranslation();
  return sections.map(({ key, href, shortcut }) => ({
    id: `section:${key}`,
    label: t(SECTION_LABELS[key]),
    icon: SECTION_ICONS[key],
    shortcut,
    onRun: () => router.navigate(href),
  }));
}

export function useCommandSource({
  intent,
  openedAt,
  query,
}: CommandSourceInput): CommandSourceState {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const chat = useAssistantChat(false);
  const access = commandAccess(useAccessView(), useHasProjects());
  const searching = intent === 'search';
  const { current, scopes } = useScopeChips(searchGroups(access.search), searching);
  const entryMeta = useEntryMeta(openedAt);
  const results = useCommandResults({
    query,
    scope: current,
    allowed: access.search,
    enabled: searching,
    openedAt,
    since: date.startOfDay(new Date(openedAt)).getTime(),
  });

  const openThread = (draft: string | null) => {
    if (draft !== null) chat.setDraft(draft);
    router.push(ASSISTANT_THREAD_HREF);
  };

  const entryItem = (entry: SearchEntry): CommandItem => ({
    id: `${entry.kind}:${entry.id}`,
    label: entry.title,
    meta: entryMeta(entry),
    ...KIND_LOOK[entry.kind],
    onRun: () => router.push(entryHref(entry, access)),
  });

  const createItem = (kind: CreateKind, quoted: string | null, first: boolean): CommandItem => ({
    id: `new:${kind}`,
    label:
      quoted === null
        ? t(CREATE_LABELS[kind])
        : t('screens.command.new-reminder-with', { query: quoted }),
    icon: 'plus',
    ink: 'accent',
    shortcut: first ? t('screens.command.key-new') : undefined,
    onRun: () =>
      kind === 'reminder'
        ? openThread(t('screens.command.reminder-draft', { query: quoted ?? '' }))
        : router.push(createHref(kind)),
  });

  const sectionItems = useSectionItems(access.sections);

  const resultGroups: CommandGroup[] = results.matches.map(({ group, entries }) => ({
    title: t(GROUP_TITLES[group]),
    items: entries.map(entryItem),
  }));

  const source: CommandSource = (typed) => ({
    actions: [
      {
        title: t('screens.command.group-actions'),
        items: actionMatches(
          access.create.map((kind) => ({ kind, label: t(CREATE_LABELS[kind]) })),
          typed,
          'reminder'
        ).map(({ kind, quoted }, at) => createItem(kind, quoted ? typed : null, at === 0)),
      },
      ...(searching
        ? [
            {
              title: t('screens.command.group-sections'),
              items: filterLabeled(sectionItems, typed),
            },
          ]
        : []),
    ],
    results: searching ? resultGroups : undefined,
    scopes,
    paging: results.paging,
    pending: results.pending,
  });

  const onAsk = (typed: string) => openThread(chat.send(typed) === 'sent' ? null : typed);

  return { source, onAsk: access.asks && searching ? onAsk : undefined };
}
