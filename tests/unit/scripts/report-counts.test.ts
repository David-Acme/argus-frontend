import { describe, expect, test } from 'bun:test';
import { duplicationCounts, unusedCounts } from '../../../scripts/lib/report-counts';

describe('report counts', () => {
  test('a jscpd report counts its duplicated lines and clones', () => {
    const counts = duplicationCounts({
      statistics: { total: { duplicatedLines: 660, clones: 45 } },
    });
    expect([...counts]).toEqual([
      ['duplicated-lines', 660],
      ['clones', 45],
    ]);
    expect(() => duplicationCounts({})).toThrow('statistics.total');
  });

  test('a knip report counts every category over every file, and never the unresolved', () => {
    const counts = unusedCounts({
      issues: [
        {
          file: 'a.ts',
          files: [{ name: 'a.ts' }],
          exports: [{ name: 'x' }, { name: 'y' }],
          unresolved: [{ name: './b' }],
        },
        { file: 'package.json', dependencies: [{ name: 'left-pad' }], types: { Shape: {} } },
      ],
    });
    expect(Object.fromEntries(counts)).toEqual({
      files: 1,
      dependencies: 1,
      devDependencies: 0,
      unlisted: 0,
      exports: 2,
      types: 1,
    });
    expect(() => unusedCounts({})).toThrow('no issues');
  });
});
