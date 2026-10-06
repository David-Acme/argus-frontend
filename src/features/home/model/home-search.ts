import type { TranslateFn } from '@/core/types';

export type SearchScope = {
  reminders: boolean;
  events: boolean;
  projects: boolean;
};

export type SearchKind = 'reminder' | 'event' | 'project' | 'task';

export function searchKinds(scope: SearchScope): SearchKind[] {
  return [
    ...(scope.reminders ? (['reminder'] as const) : []),
    ...(scope.events ? (['event'] as const) : []),
    ...(scope.projects ? (['project', 'task'] as const) : []),
  ];
}

export function searchPlaceholder(scope: SearchScope, t: TranslateFn): string {
  const names = searchKinds(scope).map((kind) => t(`screens.home.search-things.${kind}`));
  const last = names.at(-1);
  if (last === undefined) return t('common.search');
  const head = names.slice(0, -1);
  const things = head.length === 0 ? last : `${head.join(', ')} ${t('screens.home.search-or')} ${last}`;
  return t('screens.home.search-placeholder', { things });
}
