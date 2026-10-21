import { describe, expect, test } from 'bun:test';
import { runGate } from './gate-fixture';

const ZERO = 'deep-import 0\nfile-cycle 0\nslice-cycle 0\nroute-shape 0\n';
const ROUTE = "export { default } from '@/features/home';\n";
const HOME = 'export default function Home() {\n  return null;\n}\n';

function boundaries(files: Record<string, string>, baseline = ZERO, cycles = '') {
  return runGate('check-boundaries.ts', {
    'scripts/lib/cycle-baseline.txt': cycles,
    ...files,
    'scripts/lib/boundaries-baseline.txt': baseline,
  });
}

const ONE_CYCLE = 'deep-import 0\nfile-cycle 1\nslice-cycle 1\nroute-shape 0\n';
const AB_MEMBERS = [
  'file-cycle src/features/a/index.ts',
  'file-cycle src/features/b/index.ts',
  'slice-cycle features/a',
  'slice-cycle features/b',
].join('\n');
const CYCLIC = {
  'src/features/a/index.ts': "import { b } from '@/features/b';\nexport const a = () => b;\n",
  'src/features/b/index.ts': "import { a } from '@/features/a';\nexport const b = () => a;\n",
};

describe('check-boundaries', () => {
  test('one-line routes over feature indexes pass', () => {
    const run = boundaries({ 'src/app/index.tsx': ROUTE, 'src/features/home/index.tsx': HOME });
    expect(run.status).toBe(0);
  });

  test('a route with its own code is a route-shape finding', () => {
    const run = boundaries({ 'src/app/index.tsx': HOME });
    expect(run.status).toBe(1);
    expect(run.output).toContain('route-shape: 1 is above its baseline 0');
  });

  test('a layout is not a route', () => {
    const run = boundaries({ 'src/app/_layout.tsx': HOME });
    expect(run.status).toBe(0);
  });

  test('a runtime cycle between files and slices is counted, a type-only one is not', () => {
    const cyclic = boundaries({
      'src/features/a/index.ts': "import { b } from '@/features/b';\nexport const a = () => b;\n",
      'src/features/b/index.ts': "import { a } from '@/features/a';\nexport const b = () => a;\n",
    });
    const typed = boundaries({
      'src/features/a/index.ts': "import type { B } from '@/features/b';\nexport type A = B;\n",
      'src/features/b/index.ts':
        "import { a } from '@/features/a';\nexport type B = string;\nexport const b = a;\n",
    });
    expect(cyclic.output).toContain('file-cycle: 1 is above its baseline 0');
    expect(cyclic.output).toContain('slice-cycle: 1 is above its baseline 0');
    expect(typed.status).toBe(0);
  });

  test('an import around a slice index is a deep import', () => {
    const run = boundaries({
      'src/core/services/http/index.ts': "export { get } from './http.service';\n",
      'src/core/services/http/http.service.ts': 'export const get = () => 1;\n',
      'src/core/stores/user.ts':
        "import { get } from '@/core/services/http/http.service';\nexport const user = get;\n",
    });
    expect(run.output).toContain('deep-import: 1 is above its baseline 0');
  });

  test('a feature reaching into another feature is a layer violation at zero', () => {
    const run = boundaries(
      {
        'src/features/a/index.ts': "export { b } from '@/features/b/b';\n",
        'src/features/b/index.ts': "export { b } from './b';\n",
        'src/features/b/b.ts': 'export const b = 1;\n',
      },
      'deep-import 1\nfile-cycle 0\nslice-cycle 0\nroute-shape 0\n'
    );
    expect(run.status).toBe(1);
    expect(run.output).toContain(
      'violation: feature-internal | src/features/a/index.ts -> src/features/b/b.ts'
    );
  });

  test('a count below its baseline fails until lowered', () => {
    const run = boundaries(
      { 'src/app/index.tsx': ROUTE, 'src/features/home/index.tsx': HOME },
      'deep-import 2\nfile-cycle 0\nslice-cycle 0\nroute-shape 0\n'
    );
    expect(run.output).toContain('deep-import: 0 is below its baseline 2');
  });

  test('a file that joins a recorded cycle fails though the cycle count holds', () => {
    const recorded = boundaries(CYCLIC, ONE_CYCLE, AB_MEMBERS);
    const grown = boundaries(
      {
        ...CYCLIC,
        'src/features/b/index.ts':
          "import { a } from '@/features/a';\nimport { c } from './c';\nexport const b = () => [a, c];\n",
        'src/features/b/c.ts': "import { b } from '@/features/b';\nexport const c = () => b;\n",
      },
      ONE_CYCLE,
      AB_MEMBERS
    );
    expect(recorded.status).toBe(0);
    expect(grown.status).toBe(1);
    expect(grown.output).toContain('cycle: file-cycle src/features/b/c.ts is new');
  });

  test('require() is a runtime cycle edge, a lazy import() is not', () => {
    const required = boundaries({
      'src/features/a/index.ts': "export const a = () => require('@/features/b').b;\n",
      'src/features/b/index.ts': "import { a } from '@/features/a';\nexport const b = () => a;\n",
    });
    const lazy = boundaries({
      'src/features/a/index.ts': "export const a = () => import('@/features/b');\n",
      'src/features/b/index.ts': "import { a } from '@/features/a';\nexport const b = () => a;\n",
    });
    expect(required.output).toContain('file-cycle: 1 is above its baseline 0');
    expect(lazy.status).toBe(0);
  });

  test('every platform variant is an edge, and a platform-only index is a feature index', () => {
    const run = boundaries({
      'src/features/a/index.ts': "import { b } from '@/features/b';\nexport const a = () => b;\n",
      'src/features/b/index.native.ts': 'export const b = 1;\n',
      'src/features/b/index.web.ts':
        "import { a } from '@/features/a/index';\nexport const b = a;\n",
      'src/app/index.tsx': "export { default } from '@/features/b/index';\n",
    });
    expect(run.output).toContain('file-cycle: 1 is above its baseline 0');
    expect(run.output).not.toContain('app-feature-internal');
    expect(run.output).not.toContain('feature-internal |');
  });

  test('an import into a slice without an index is a deep import', () => {
    const run = boundaries({
      'src/core/services/desktop/window.ts': 'export const win = 1;\n',
      'src/core/stores/ui.ts':
        "import { win } from '@/core/services/desktop/window';\nexport const ui = win;\n",
    });
    expect(run.output).toContain('deep-import: 1 is above its baseline 0');
  });
});
