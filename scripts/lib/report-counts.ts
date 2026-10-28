import type { Counts } from './ratchet';

export const KNIP_CATEGORIES = [
  'files',
  'dependencies',
  'devDependencies',
  'unlisted',
  'exports',
  'types',
] as const;

type JscpdReport = { statistics?: { total?: { duplicatedLines?: number; clones?: number } } };

type KnipIssue = Record<string, unknown>;

type KnipReport = { issues?: readonly KnipIssue[] };

export function duplicationCounts(report: JscpdReport): Counts {
  const total = report.statistics?.total;
  if (total?.duplicatedLines === undefined || total.clones === undefined)
    throw new Error('jscpd report has no statistics.total');
  return new Map([
    ['duplicated-lines', total.duplicatedLines],
    ['clones', total.clones],
  ]);
}

const entriesOf = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length;
  return 0;
};

export function unusedCounts(report: KnipReport): Counts {
  if (!report.issues) throw new Error('knip report has no issues');
  const issues = report.issues;
  return new Map(
    KNIP_CATEGORIES.map((category) => [
      category,
      issues.reduce((sum, issue) => sum + entriesOf(issue[category]), 0),
    ])
  );
}
