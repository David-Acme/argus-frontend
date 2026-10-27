import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { TranslateFn, TranslationKey } from '@/core/types';
import { ASSISTANT_THREAD_HREF } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { CommandIntent, CommandItem, CommandScopes, CommandSource } from '@/shared/ui/command';
import { useAssistantChat } from '@/features/voice';
import { SEARCH_GROUP_TITLES, useCommandSearch } from '@/features/command/hooks/use-command-search';
import {
  createHref,
  type CommandAccess,
  type CreateKind,
} from '@/features/command/model/command-access';
import {
  actionMatches,
  filterLabeled,
  type SearchGroup,
  type SearchScopeKey,
} from '@/features/command/model/command-search';

export type CommandSourceInput = { intent: CommandIntent; openedAt: number; query: string };

export type CommandSourceState = {
  source: CommandSource;
  onAsk?: (query: string) => void;
};

const CREATE_LABELS = {
  reminder: 'screens.command.ask-reminder',
  event: 'screens.agenda.new-event',
  task: 'screens.projects.new-task',
  project: 'screens.projects.new-project',
} as const satisfies Record<CreateKind, TranslationKey>;

type ScopeChipsInput = {
  groups: readonly SearchGroup[];
  current: SearchScopeKey;
  onChange: (scope: SearchScopeKey) => void;
  t: TranslateFn;
};

function scopeChips({ groups, current, onChange, t }: ScopeChipsInput): CommandScopes | undefined {
  return groups.length > 1
    ? {
        options: [
          { key: 'all', label: t('screens.command.scope-all') },
          ...groups.map((group) => ({ key: group, label: t(SEARCH_GROUP_TITLES[group]) })),
        ],
        value: current,
        onChange: (key) => onChange(groups.find((group) => group === key) ?? 'all'),
      }
    : undefined;
}

function useSectionItems(sections: CommandAccess['sections']): CommandItem[] {
  const router = useRouter();
  const { t } = useTranslation();
  return sections.map(({ key, href, icon, label, shortcut }) => ({
    id: `section:${key}`,
    label: t(label),
    icon,
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
  const chat = useAssistantChat(false);
  const searching = intent === 'search';
  const [scope, setScope] = useState<SearchScopeKey>('all');
  const search = useCommandSearch({ query, scope, openedAt, enabled: searching });
  const access = search.access;
  const scopes = searching
    ? scopeChips({ groups: search.groups, current: search.scope, onChange: setScope, t })
    : undefined;

  const openThread = (draft: string | null) => {
    if (draft !== null) chat.setDraft(draft);
    router.push(ASSISTANT_THREAD_HREF);
  };

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
    results: searching ? search.results : undefined,
    scopes,
    paging: search.paging,
    pending: search.pending,
  });

  const onAsk = (typed: string) => openThread(chat.send(typed) === 'sent' ? null : typed);

  return { source, onAsk: access.asks && searching ? onAsk : undefined };
}
