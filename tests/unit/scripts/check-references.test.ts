import { describe, expect, test } from 'bun:test';
import { runGate } from './gate-fixture';

const REFERENCES = [
  '| Key | Source | It is the authority for |',
  '|---|---|---|',
  '| [nng-errors] | [Errors](https://www.nngroup.com/errors) | error messages |',
  '| [wcag22] | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | thresholds |',
].join('\n');

function references(agents: string, table = REFERENCES) {
  return runGate('check-references.ts', {
    'docs/references.md': table,
    'AGENTS.md': agents,
    'docs/plans/plan.md': '- [x] done\n',
  });
}

describe('check-references', () => {
  test('known keys, a matching family, code spans and links pass', () => {
    const run = references(
      'Contrast [wcag22], errors [nng-*], code `a[i]`, a [link](https://x.y) and [x] boxes.\n'
    );
    expect(run.status).toBe(0);
  });

  test('an unknown key fails and names the document', () => {
    const run = references('See [made-up-source].\n');
    expect(run.status).toBe(1);
    expect(run.output).toContain('AGENTS.md: [made-up-source] is not in docs/references.md');
  });

  test('a family that matches no key fails', () => {
    const run = references('See [apple-*].\n');
    expect(run.output).toContain('[apple-*] is not in docs/references.md');
  });

  test('a reference row without a URL fails', () => {
    const run = references('See [wcag22].\n', `${REFERENCES}\n| [orphan] | a book | nothing |`);
    expect(run.output).toContain('docs/references.md: [orphan] has no URL');
  });
});
