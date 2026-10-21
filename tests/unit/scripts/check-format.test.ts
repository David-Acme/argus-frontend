import { describe, expect, test } from 'bun:test';
import { runGate } from './gate-fixture';

const FORMATTED = 'export const a = 1;\n';
const UNFORMATTED = 'export   const a=1\n';

describe('check-format', () => {
  test('formatted files and an empty list pass', () => {
    const run = runGate('check-format.ts', {
      'src/a.ts': FORMATTED,
      'scripts/lib/format-baseline.txt': '',
    });
    expect(run.status).toBe(0);
  });

  test('an unformatted file not on the list fails', () => {
    const run = runGate('check-format.ts', {
      'src/a.ts': UNFORMATTED,
      'scripts/lib/format-baseline.txt': '',
    });
    expect(run.status).toBe(1);
    expect(run.output).toContain('unformatted: src/a.ts is new');
  });

  test('a listed file may stay unformatted', () => {
    const run = runGate('check-format.ts', {
      'src/a.ts': UNFORMATTED,
      'scripts/lib/format-baseline.txt': 'src/a.ts\n',
    });
    expect(run.status).toBe(0);
  });

  test('a listed file that is now formatted must leave the list', () => {
    const run = runGate('check-format.ts', {
      'src/a.ts': FORMATTED,
      'scripts/lib/format-baseline.txt': 'src/a.ts\n',
    });
    expect(run.status).toBe(1);
    expect(run.output).toContain('src/a.ts is fixed');
  });
});
