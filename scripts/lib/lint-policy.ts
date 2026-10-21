export type ResolvedConfig = {
  rules?: Record<string, unknown>;
  linterOptions?: {
    noInlineConfig?: boolean;
    reportUnusedDisableDirectives?: unknown;
    reportUnusedInlineConfigs?: unknown;
  };
};

export type ExceptionRow = { rule: string; paths: string[] };

export type ConfigBlock = {
  files?: unknown[];
  ignores?: unknown[];
  rules?: Record<string, unknown>;
};

export type PolicyInput = {
  resolved: ReadonlyMap<string, ResolvedConfig>;
  base: ReadonlyMap<string, ResolvedConfig>;
  rows: readonly ExceptionRow[];
  blocks?: readonly ConfigBlock[];
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
    if (!line.startsWith('|') || !/^`[^`]+`(,\s*`[^`]+`)*$/.test(cells[1] ?? '')) continue;
    const paths = [...(cells[2] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
    for (const match of (cells[1] ?? '').matchAll(/`([^`]+)`/g))
      rows.push({ rule: match[1] ?? '', paths });
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

const globMatches = (pattern: unknown, file: string): boolean =>
  typeof pattern === 'string'
    ? new Bun.Glob(pattern).match(file)
    : Array.isArray(pattern) && pattern.every((part) => globMatches(part, file));

const anyMatches = (patterns: readonly unknown[] | undefined, file: string): boolean =>
  (patterns ?? []).some((pattern) => globMatches(pattern, file));

function scopedExemptions(
  blocks: readonly ConfigBlock[],
  file: string,
  config: ResolvedConfig
): string[] {
  return blocks
    .filter((block) => anyMatches(block.files, file) && anyMatches(block.ignores, file))
    .flatMap((block) => Object.entries(block.rules ?? {}))
    .filter(
      ([rule, entry]) => (severity(entry) ?? 0) > 0 && !((severity(config.rules?.[rule]) ?? 0) > 0)
    )
    .map(([rule]) => rule);
}

function exceptionsOf(input: PolicyInput): { warns: string[]; offs: Map<string, string[]> } {
  const warns: string[] = [];
  const offs = new Map<string, string[]>();
  const add = (rule: string, file: string) => {
    if (!(offs.get(rule) ?? []).includes(file)) offs.set(rule, [...(offs.get(rule) ?? []), file]);
  };
  for (const [file, config] of input.resolved) {
    const baseRules = input.base.get(file)?.rules ?? {};
    for (const [rule, entry] of Object.entries(config.rules ?? {})) {
      const level = severity(entry);
      if (level === 1) warns.push(`${file}: ${rule} is a warning; every adopted rule is an error`);
      if (level === 0 && severity(baseRules[rule]) !== 0) add(rule, file);
    }
    for (const rule of scopedExemptions(input.blocks ?? [], file, config)) add(rule, file);
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
