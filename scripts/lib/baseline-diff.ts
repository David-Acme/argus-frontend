export type BaselineKind = 'counts' | 'list' | 'memo' | 'bundle' | 'suppressions';

export type Baseline = { path: string; kind: BaselineKind; floors?: readonly string[] };

export type Looseness = Map<string, number>;

export type RebaselineRow = { line: string; baseline: string; entries: string[] };

export const BASELINES: readonly Baseline[] = [
  { path: 'scripts/lib/quality-baseline.txt', kind: 'counts', floors: ['scanned-files'] },
  { path: 'scripts/lib/boundaries-baseline.txt', kind: 'counts' },
  { path: 'scripts/lib/cycle-baseline.txt', kind: 'list' },
  { path: 'scripts/lib/untested-baseline.txt', kind: 'list' },
  { path: 'scripts/lib/format-baseline.txt', kind: 'list' },
  { path: 'scripts/lib/memo-exceptions.txt', kind: 'memo' },
  { path: 'scripts/lib/bundle-baseline.txt', kind: 'bundle' },
  { path: 'scripts/lib/duplication-baseline.txt', kind: 'counts' },
  { path: 'scripts/lib/unused-baseline.txt', kind: 'counts' },
  { path: 'eslint-suppressions.json', kind: 'suppressions' },
];

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

function countLooseness(text: string, floors: readonly string[]): Looseness {
  const looseness: Looseness = new Map();
  for (const line of lines(text)) {
    const [metric = '', value = '0'] = line.split(/\s+/);
    looseness.set(metric, floors.includes(metric) ? -Number(value) : Number(value));
  }
  return looseness;
}

function bundleLooseness(text: string): Looseness {
  const looseness: Looseness = new Map();
  for (const line of lines(text)) {
    const [key = '', value = ''] = line.split(/\s+/);
    if (key === 'lazy') looseness.set(`lazy ${value}`, -1);
    else looseness.set(key, Number(value));
  }
  return looseness;
}

type Suppressions = Record<string, Record<string, { count?: number }>>;

function suppressionLooseness(text: string): Looseness {
  const looseness: Looseness = new Map();
  if (text.trim().length === 0) return looseness;
  const parsed = JSON.parse(text) as Suppressions;
  for (const [file, rules] of Object.entries(parsed))
    for (const [rule, entry] of Object.entries(rules))
      looseness.set(`${file} ${rule}`, entry.count ?? 0);
  return looseness;
}

export function looseness(baseline: Baseline, text: string): Looseness {
  switch (baseline.kind) {
    case 'counts':
      return countLooseness(text, baseline.floors ?? []);
    case 'list':
      return new Map(lines(text).map((line) => [line, 1]));
    case 'memo':
      return new Map(lines(text).map((line) => [line.split(/\s+/).slice(0, 2).join(' '), 1]));
    case 'bundle':
      return bundleLooseness(text);
    case 'suppressions':
      return suppressionLooseness(text);
  }
}

export function raisedEntries(before: Looseness, after: Looseness): string[] {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((key) => (after.get(key) ?? 0) > (before.get(key) ?? 0)).sort();
}

export function parseRebaselineRows(markdown: string): RebaselineRow[] {
  const all = markdown.split('\n');
  const start = all.findIndex((line) => /^#+\s+Re-baselines\s*$/.test(line));
  if (start === -1) return [];
  const rows: RebaselineRow[] = [];
  for (const line of all.slice(start + 1)) {
    if (/^#+\s/.test(line)) break;
    const cells = line.split('|').map((cell) => cell.trim());
    const baseline = /^`([^`]+)`$/.exec(cells[1] ?? '')?.[1];
    if (!line.startsWith('|') || !baseline) continue;
    const entries = [...(cells[2] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
    rows.push({ line: line.trim(), baseline, entries });
  }
  return rows;
}

export function newRows(before: string, after: string): RebaselineRow[] {
  const recorded = new Set(parseRebaselineRows(before).map((row) => row.line));
  return parseRebaselineRows(after).filter((row) => !recorded.has(row.line));
}

const names = (row: RebaselineRow, raise: Raise): boolean =>
  row.baseline === raise.baseline &&
  row.entries.some(
    (pattern) => pattern === raise.entry || new Bun.Glob(pattern).match(raise.entry)
  );

export type BaselineChange = { baseline: Baseline; before: string; after: string };

export type Raise = { baseline: string; entry: string };

export function raises(changes: readonly BaselineChange[]): Raise[] {
  return changes.flatMap(({ baseline, before, after }) =>
    raisedEntries(looseness(baseline, before), looseness(baseline, after)).map((entry) => ({
      baseline: baseline.path,
      entry,
    }))
  );
}

export function rebaselineFailures(
  changes: readonly BaselineChange[],
  rows: readonly RebaselineRow[]
): string[] {
  const raised = raises(changes);
  const unrecorded = raised
    .filter((raise) => !rows.some((row) => names(row, raise)))
    .map(
      (raise) =>
        `${raise.baseline}: ${raise.entry} was raised without a new row in CONTEXT.md › Re-baselines`
    );
  const idle = rows
    .filter((row) => !raised.some((raise) => names(row, raise)))
    .map((row) => `the Re-baselines row for ${row.baseline} names nothing this change raises`);
  return [...unrecorded, ...idle];
}
