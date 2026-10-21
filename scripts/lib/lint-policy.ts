export type ResolvedConfig = {
  rules?: Record<string, unknown>;
  linterOptions?: {
    noInlineConfig?: boolean;
    reportUnusedDisableDirectives?: unknown;
    reportUnusedInlineConfigs?: unknown;
  };
};

export type ExceptionRow = { rule: string; paths: string[] };

export type PolicyInput = {
  resolved: ReadonlyMap<string, ResolvedConfig>;
  base: ReadonlyMap<string, ResolvedConfig>;
  rows: readonly ExceptionRow[];
};

const SEVERITIES: Record<string, number> = { off: 0, warn: 1, error: 2, '0': 0, '1': 1, '2': 2 };

export function severity(entry: unknown): number | null {
  const level = Array.isArray(entry) ? entry[0] : entry;
  return SEVERITIES[String(level)] ?? null;
}

export function parseExceptionRows(markdown: string): ExceptionRow[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => /^#+\s+Lint exceptions\s*$/.test(line));
  if (start === -1) return [];
  const rows: ExceptionRow[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#+\s/.test(line)) break;
    const cells = line.split('|').map((cell) => cell.trim());
    const rule = /^`([^`]+)`$/.exec(cells[1] ?? '')?.[1];
    if (!line.startsWith('|') || !rule) continue;
    rows.push({
      rule,
      paths: [...(cells[2] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? ''),
    });
  }
  return rows;
}

function optionFailures(file: string, config: ResolvedConfig): string[] {
  const options = config.linterOptions ?? {};
  const failures: string[] = [];
  if (options.noInlineConfig !== true)
    failures.push(`${file}: linterOptions.noInlineConfig is not true`);
  if (severity(options.reportUnusedDisableDirectives) !== 2)
    failures.push(`${file}: reportUnusedDisableDirectives is not 'error'`);
  if (severity(options.reportUnusedInlineConfigs) !== 2)
    failures.push(`${file}: reportUnusedInlineConfigs is not 'error'`);
  return failures;
}

function exceptionsOf(input: PolicyInput): { warns: string[]; offs: Map<string, string[]> } {
  const warns: string[] = [];
  const offs = new Map<string, string[]>();
  for (const [file, config] of input.resolved) {
    const baseRules = input.base.get(file)?.rules ?? {};
    for (const [rule, entry] of Object.entries(config.rules ?? {})) {
      const level = severity(entry);
      if (level === 1) warns.push(`${file}: ${rule} is a warning; every adopted rule is an error`);
      if (level === 0 && severity(baseRules[rule]) !== 0)
        offs.set(rule, [...(offs.get(rule) ?? []), file]);
    }
  }
  return { warns, offs };
}

const covers = (row: ExceptionRow, file: string) =>
  row.paths.some((path) => new Bun.Glob(path).match(file));

export function policyFailures(input: PolicyInput): string[] {
  const { warns, offs } = exceptionsOf(input);
  const options = [...input.resolved].flatMap(([file, config]) => optionFailures(file, config));
  const unlisted = [...offs].flatMap(([rule, files]) =>
    files
      .filter((file) => !input.rows.some((row) => row.rule === rule && covers(row, file)))
      .map((file) => `${rule} is off for ${file} without a row in CONTEXT.md › Lint exceptions`)
  );
  const unused = input.rows
    .filter((row) => !(offs.get(row.rule) ?? []).some((file) => covers(row, file)))
    .map(
      (row) => `the Lint exceptions row for ${row.rule} (${row.paths.join(', ')}) turns nothing off`
    );
  return [...new Set(options)].slice(0, 3).concat(warns, unlisted, unused);
}
