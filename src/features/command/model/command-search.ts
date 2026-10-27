export type SearchKind = 'event' | 'task' | 'project' | 'person' | 'camera';

export type SearchGroup = 'agenda' | 'projects' | 'people' | 'cameras';

export type SearchEntry = {
  kind: SearchKind;
  id: string;
  title: string;
  folded: string;
  at: number | null;
  allDay?: boolean;
  parentId?: string;
};

export type SearchMatches = { group: SearchGroup; entries: readonly SearchEntry[] };

export const SEARCH_GROUP_LIMIT = 5;

const GROUP_OF: Readonly<Record<SearchKind, SearchGroup>> = {
  event: 'agenda',
  task: 'agenda',
  project: 'projects',
  person: 'people',
  camera: 'cameras',
};

const GROUP_ORDER: readonly SearchGroup[] = ['agenda', 'projects', 'people', 'cameras'];

const MARKS = /\p{M}/gu;

export const foldText = (text: string): string =>
  text.normalize('NFD').replace(MARKS, '').toLocaleLowerCase().trim();

export function foldedScore(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  if (haystack.startsWith(needle)) return 3;
  if (haystack.includes(` ${needle}`)) return 2;
  return haystack.includes(needle) ? 1 : 0;
}

function byTime(left: number | null, right: number | null, now: number): number {
  const leftAhead = left !== null && left >= now;
  const rightAhead = right !== null && right >= now;
  if (leftAhead !== rightAhead) return leftAhead ? -1 : 1;
  if (left === null || right === null) return Number(left === null) - Number(right === null);
  return leftAhead ? left - right : right - left;
}

type RankInput = {
  entries: readonly SearchEntry[];
  needle: string;
  now: number;
  limit?: number;
};

export function rankEntries({
  entries,
  needle,
  now,
  limit = SEARCH_GROUP_LIMIT,
}: RankInput): SearchEntry[] {
  return entries
    .map((entry) => ({ entry, score: foldedScore(entry.folded, needle) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        byTime(left.entry.at, right.entry.at, now) ||
        left.entry.title.localeCompare(right.entry.title)
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function searchMatches(
  entries: readonly SearchEntry[],
  query: string,
  now: number
): SearchMatches[] {
  const needle = foldText(query);
  if (needle.length === 0) return [];
  return GROUP_ORDER.map((group) => ({
    group,
    entries: rankEntries({
      entries: entries.filter((entry) => GROUP_OF[entry.kind] === group),
      needle,
      now,
    }),
  })).filter((matches) => matches.entries.length > 0);
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
