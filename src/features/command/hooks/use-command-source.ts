import { useRouter } from 'expo-router';
import type {
  ICameraCacheRow,
  IEventListCacheRow,
  IPeopleDirectoryCacheRow,
  IProjectCacheRow,
  IProjectTaskCacheRow,
} from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { ASSISTANT_THREAD_HREF, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useSurfaces } from '@/shared/libs/surfaces';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { CommandGroup, CommandIntent, CommandItem, CommandSource } from '@/shared/ui/command';
import type { IconGlyph } from '@/shared/ui/icon';
import { useAssistantChat } from '@/features/voice';
import {
  commandAccess,
  createHref,
  entryHref,
  type CreateKind,
} from '@/features/command/model/command-access';
import {
  searchEntries,
  whenLabel,
  type SearchRows,
} from '@/features/command/model/command-entries';
import {
  actionMatches,
  filterLabeled,
  searchMatches,
  type SearchEntry,
  type SearchGroup,
  type SearchKind,
} from '@/features/command/model/command-search';

export type CommandSourceInput = { intent: CommandIntent; openedAt: number };

export type CommandSourceState = {
  source: CommandSource;
  onAsk?: (query: string) => void;
};

const KIND_ICONS: Readonly<Record<SearchKind, IconGlyph>> = {
  event: 'cal',
  task: 'check',
  project: 'grid',
  person: 'user',
  camera: 'cam',
};

const GROUP_TITLES = {
  agenda: 'screens.command.group-agenda',
  projects: 'screens.command.group-projects',
  people: 'screens.command.group-people',
  cameras: 'screens.command.group-cameras',
} as const satisfies Record<SearchGroup, TranslationKey>;

const CREATE_LABELS = {
  reminder: 'screens.command.ask-reminder',
  event: 'screens.agenda.new-event',
  task: 'screens.projects.new-task',
  project: 'screens.projects.new-project',
} as const satisfies Record<CreateKind, TranslationKey>;

function useSearchRows(): SearchRows {
  return {
    events: useViewCacheRows<IEventListCacheRow>(VIEW_CACHE_KEYS.eventList),
    tasks: useViewCacheRows<IProjectTaskCacheRow>(VIEW_CACHE_KEYS.taskList),
    projects: useViewCacheRows<IProjectCacheRow>(VIEW_CACHE_KEYS.projectList),
    people: useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers),
    cameras: useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList),
  };
}

export function useCommandSource({ intent, openedAt }: CommandSourceInput): CommandSourceState {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const chat = useAssistantChat(false);
  const rows = useSearchRows();
  const access = commandAccess(useAccessView(), rows.projects.length > 0, useSurfaces());
  const entries = searchEntries(rows, openedAt).filter((entry) => access.search.has(entry.kind));
  const searching = intent === 'search';

  const openThread = (draft: string | null) => {
    if (draft !== null) chat.setDraft(draft);
    router.push(ASSISTANT_THREAD_HREF);
  };

  const entryItem = (entry: SearchEntry): CommandItem => ({
    id: `${entry.kind}:${entry.id}`,
    label: entry.title,
    meta:
      entry.at === null
        ? undefined
        : whenLabel({ at: entry.at, allDay: entry.allDay, now: openedAt, date, t }),
    icon: KIND_ICONS[entry.kind],
    onRun: () => router.push(entryHref(entry, access)),
  });

  const createItem = (kind: CreateKind, quoted: string | null, first: boolean): CommandItem => ({
    id: `new:${kind}`,
    label:
      quoted === null
        ? t(CREATE_LABELS[kind])
        : t('screens.command.new-reminder-with', { query: quoted }),
    icon: 'plus',
    shortcut: first ? t('screens.command.key-new') : undefined,
    onRun: () =>
      kind === 'reminder'
        ? openThread(t('screens.command.reminder-draft', { query: quoted ?? '' }))
        : router.push(createHref(kind)),
  });

  const sectionItems: CommandItem[] = access.sections.map(
    ({ key, href, icon, label, shortcut }) => ({
      id: `section:${key}`,
      label: t(label),
      icon,
      shortcut,
      onRun: () => router.navigate(href),
    })
  );

  const source: CommandSource = (query) => {
    const groups: CommandGroup[] = [
      ...(searching ? searchMatches(entries, query, openedAt) : []).map(
        ({ group, entries: found }) => ({
          title: t(GROUP_TITLES[group]),
          items: found.map(entryItem),
        })
      ),
      {
        title: t('screens.command.group-actions'),
        items: actionMatches(
          access.create.map((kind) => ({ kind, label: t(CREATE_LABELS[kind]) })),
          query,
          'reminder'
        ).map(({ kind, quoted }, at) => createItem(kind, quoted ? query : null, at === 0)),
      },
      ...(searching
        ? [
            {
              title: t('screens.command.group-sections'),
              items: filterLabeled(sectionItems, query),
            },
          ]
        : []),
    ];
    return groups.filter((group) => group.items.length > 0);
  };

  const onAsk = (query: string) => openThread(chat.send(query) === 'sent' ? null : query);

  return { source, onAsk: access.asks && searching ? onAsk : undefined };
}
