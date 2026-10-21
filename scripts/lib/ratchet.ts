import { existsSync, readFileSync } from 'node:fs';

export type Counts = Map<string, number>;

export function readLines(path: string): string[] {
  if (!existsSync(path)) throw new Error(`missing baseline ${path}`);
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function readCounts(path: string): Counts {
  const counts: Counts = new Map();
  for (const line of readLines(path)) {
    const [metric, value] = line.split(/\s+/);
    if (!metric || value === undefined || !/^\d+$/.test(value))
      throw new Error(`${path}: malformed line "${line}"`);
    counts.set(metric, Number(value));
  }
  return counts;
}

export function formatCounts(counts: Counts): string {
  return [...counts].map(([metric, value]) => `${metric} ${value}`).join('\n') + '\n';
}

function countFailure(
  metric: string,
  current: number | undefined,
  recorded: number | undefined
): string | null {
  if (recorded === undefined) return `${metric}: ${current} has no baseline line`;
  if (current === undefined) return `${metric}: baseline ${recorded} is no longer measured`;
  if (current > recorded) return `${metric}: ${current} is above its baseline ${recorded}`;
  if (current < recorded)
    return `${metric}: ${current} is below its baseline ${recorded}; lower the baseline in this change`;
  return null;
}

export function compareCounts(baseline: Counts, current: Counts): string[] {
  const metrics = new Set([...baseline.keys(), ...current.keys()]);
  return [...metrics]
    .map((metric) => countFailure(metric, current.get(metric), baseline.get(metric)))
    .filter((failure): failure is string => failure !== null);
}

export function compareLists(
  label: string,
  baseline: readonly string[],
  current: readonly string[]
): string[] {
  const recorded = new Set(baseline);
  const now = new Set(current);
  const added = current
    .filter((entry) => !recorded.has(entry))
    .map((entry) => `${label}: ${entry} is new`);
  const gone = baseline
    .filter((entry) => !now.has(entry))
    .map((entry) => `${label}: ${entry} is fixed; remove it from the baseline in this change`);
  return [...added, ...gone];
}

export function report(gate: string, failures: readonly string[], summary: string): void {
  for (const failure of failures) console.log(`${gate}: ${failure}`);
  console.log(`${gate}: ${summary}, ${failures.length} failures`);
  process.exitCode = failures.length > 0 ? 1 : 0;
}
