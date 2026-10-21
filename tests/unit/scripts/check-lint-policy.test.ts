import { describe, expect, test } from 'bun:test';
import {
  parseExceptionRows,
  policyFailures,
  type ResolvedConfig,
} from '../../../scripts/lib/lint-policy';

const OPTIONS = {
  noInlineConfig: true,
  reportUnusedDisableDirectives: 2,
  reportUnusedInlineConfigs: 2,
};
const CONTEXT = [
  '## Lint exceptions',
  '',
  '| Rule | Paths | Reason | Source or measurement | Date |',
  '|---|---|---|---|---|',
  '| `no-console` | `src/log.ts`, `scripts/**` | the logger | rule 33 | 2026-10-20 |',
  '',
  '## Next',
  '| `ignored` | `src/**` | outside the section | - | - |',
].join('\n');

function input(
  resolved: Record<string, ResolvedConfig>,
  base: Record<string, ResolvedConfig> = {}
) {
  return {
    resolved: new Map(Object.entries(resolved)),
    base: new Map(Object.entries(base)),
    rows: parseExceptionRows(CONTEXT),
  };
}

describe('check-lint-policy', () => {
  test('the rows of the Lint exceptions section are read, and nothing after it', () => {
    expect(parseExceptionRows(CONTEXT)).toEqual([
      { rule: 'no-console', paths: ['src/log.ts', 'scripts/**'] },
    ]);
  });

  test('an exception with its row passes', () => {
    const failures = policyFailures(
      input({ 'src/log.ts': { linterOptions: OPTIONS, rules: { 'no-console': 0, eqeqeq: 2 } } })
    );
    expect(failures).toEqual([]);
  });

  test('a rule turned off without a row fails, and the unused row fails too', () => {
    const failures = policyFailures(
      input({ 'src/a.ts': { linterOptions: OPTIONS, rules: { complexity: 'off' } } })
    );
    expect(failures).toContain(
      'complexity is off for src/a.ts without a row in CONTEXT.md › Lint exceptions'
    );
    expect(failures).toContain(
      'the Lint exceptions row for no-console (src/log.ts, scripts/**) turns nothing off'
    );
  });

  test('a rule the base itself turns off is not an exception', () => {
    const failures = policyFailures(
      input(
        { 'src/log.ts': { linterOptions: OPTIONS, rules: { 'no-console': 0, 'no-undef': 0 } } },
        { 'src/log.ts': { rules: { 'no-undef': 'off' } } }
      )
    );
    expect(failures).toEqual([]);
  });

  test('a warning and inline configuration fail', () => {
    const failures = policyFailures(
      input({
        'src/log.ts': {
          linterOptions: { ...OPTIONS, noInlineConfig: false },
          rules: { 'no-console': 0, eqeqeq: ['warn'] },
        },
      })
    );
    expect(failures).toContain('src/log.ts: linterOptions.noInlineConfig is not true');
    expect(failures).toContain('src/log.ts: eqeqeq is a warning; every adopted rule is an error');
  });

  test('a rule a block leaves out through its ignores is an exemption that needs a row', () => {
    const blocks = [
      {
        files: ['src/**/*.ts'],
        ignores: ['src/date.ts'],
        rules: { 'argus/date-home': 'error', 'argus/syntax': 'error' },
      },
    ];
    const resolved = {
      'src/date.ts': { linterOptions: OPTIONS, rules: {} },
      'src/log.ts': { linterOptions: OPTIONS, rules: { 'no-console': 0, 'argus/syntax': 2 } },
    };
    const failures = policyFailures({ ...input(resolved), blocks });
    expect(failures).toContain(
      'argus/date-home is off for src/date.ts without a row in CONTEXT.md › Lint exceptions'
    );
    expect(failures).toContain(
      'argus/syntax is off for src/date.ts without a row in CONTEXT.md › Lint exceptions'
    );
    expect(failures.some((failure) => failure.includes('src/log.ts'))).toBe(false);
  });

  test('a row names several rules that share its paths', () => {
    const markdown =
      '## Lint exceptions\n| `max-lines`, `max-depth` | `src/locales/**` | data | rule 32 | 2026-10-20 |\n';
    expect(parseExceptionRows(markdown)).toEqual([
      { rule: 'max-lines', paths: ['src/locales/**'] },
      { rule: 'max-depth', paths: ['src/locales/**'] },
    ]);
  });
});
