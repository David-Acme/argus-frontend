import type { SearchKind } from '@/core/types';
import { foldText } from '@/shared/libs/text-search';

export type { SearchKind };

export type SearchGroup = 'agenda' | 'projects' | 'people' | 'cameras';

export type SearchScopeKey = 'all' | SearchGroup;

export type SearchEntry = {
  kind: SearchKind;
  id: string;
  title: string;
  at: number | null;
  allDay?: boolean;
  parentId?: string;
};

export type SearchMatches = { group: SearchGroup; entries: readonly SearchEntry[] };

export const GROUP_OF: Readonly<Record<SearchKind, SearchGroup>> = {
  event: 'agenda',
  task: 'agenda',
  project: 'projects',
  person: 'people',
  camera: 'cameras',
};

export const GROUP_ORDER: readonly SearchGroup[] = ['agenda', 'projects', 'people', 'cameras'];

const KIND_ORDER: readonly SearchKind[] = ['event', 'task', 'project', 'person', 'camera'];

export function searchGroups(allowed: ReadonlySet<SearchKind>): SearchGroup[] {
  return GROUP_ORDER.filter((group) =>
    KIND_ORDER.some((kind) => GROUP_OF[kind] === group && allowed.has(kind))
  );
}

export function scopeKinds(scope: SearchScopeKey, allowed: ReadonlySet<SearchKind>): SearchKind[] {
  return KIND_ORDER.filter(
    (kind) => allowed.has(kind) && (scope === 'all' || GROUP_OF[kind] === scope)
  );
}

export function groupEntries(entries: readonly SearchEntry[]): SearchMatches[] {
  const groups: SearchMatches[] = [];
  for (const entry of entries) {
    const group = GROUP_OF[entry.kind];
    const last = groups[groups.length - 1];
    if (last?.group === group) last.entries = [...last.entries, entry];
    else groups.push({ group, entries: [entry] });
  }
  return groups;
}

export function foldedScore(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  if (haystack.startsWith(needle)) return 3;
  if (haystack.includes(` ${needle}`)) return 2;
  return haystack.includes(needle) ? 1 : 0;
}

export function filterLabeled<T extends { label: string }>(
  items: readonly T[],
  query: string
): T[] {
  const needle = foldText(query);
  if (needle.length === 0) return [...items];
  return items.filter((item) => foldedScore(foldText(item.label), needle) > 0);
}

export type LabeledAction<K extends string> = { kind: K; label: string };

export type ActionMatch<K extends string> = { kind: K; quoted: boolean };

export function actionMatches<K extends string>(
  actions: readonly LabeledAction<K>[],
  query: string,
  quotable: K
): ActionMatch<K>[] {
  const matched = filterLabeled(actions, query).map(({ kind }) => ({ kind, quoted: false }));
  const quotes =
    foldText(query).length > 0 &&
    actions.some((action) => action.kind === quotable) &&
    !matched.some((action) => action.kind === quotable);
  return quotes ? [...matched, { kind: quotable, quoted: true }] : matched;
}
