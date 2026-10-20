import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSISTANT_CALL_HREF, ASSISTANT_THREAD_HREF } from '@/shared/constants';
import { CHECKLIST_TARGETS, checklistTarget } from '@/features/modules/model/checklist-routes';
import { EVIDENCED_STEPS } from '@/features/modules/model/getting-started';
import { backendPath } from '@tests/support/backend-dir';

type CatalogStep = { id: string; route?: string; screen?: string };
type CatalogModule = { id: string; gettingStarted?: CatalogStep[] };

const APP_ROOT = join(import.meta.dir, '../../../../src/app');

const catalogSteps = (): { module: string; step: CatalogStep }[] => {
  const catalog = JSON.parse(readFileSync(backendPath('services/settings/modules.json'), 'utf8')) as {
    modules: CatalogModule[];
  };
  return catalog.modules.flatMap((module) => (module.gettingStarted ?? []).map((step) => ({ module: module.id, step })));
};

const appRouteExists = (href: string): boolean => {
  const path = href.split(/[?#]/)[0] ?? href;
  const segments = path.split('/').filter(Boolean);
  const dynamic = segments.length > 0 ? [...segments.slice(0, -1), '[id]'] : [];
  return ['', '(app)'].some((group) => {
    const base = join(APP_ROOT, group);
    return [
      join(base, ...segments, 'index.tsx'),
      join(base, ...segments) + '.tsx',
      join(base, ...dynamic) + '.tsx',
    ].some((file) => segments.length > 0 && existsSync(file));
  });
};

describe('every getting-started step of the backend catalog opens a screen the app has', () => {
  const steps = catalogSteps();

  test('the backend catalog has steps to check', () => {
    expect(steps.length).toBeGreaterThan(0);
  });

  for (const { module, step } of steps) {
    test(`${module}:${step.id} resolves to an existing route in both assistant modes`, () => {
      for (const assistant of [ASSISTANT_CALL_HREF, ASSISTANT_THREAD_HREF]) {
        const target = checklistTarget(step.screen ?? step.route ?? null, assistant);
        expect(target).not.toBeNull();
        expect(appRouteExists(target ?? '')).toBe(true);
      }
    });

    test(`${module}:${step.id} is ticked by a real condition, never by a tap`, () => {
      expect(EVIDENCED_STEPS.has(step.id)).toBe(true);
    });
  }

  test('every target in the table is a route the app has', () => {
    for (const target of Object.values(CHECKLIST_TARGETS)) {
      const hrefs = target === 'assistant' ? [ASSISTANT_CALL_HREF, ASSISTANT_THREAD_HREF] : [target];
      for (const href of hrefs) expect(appRouteExists(href)).toBe(true);
    }
  });

  test('the catalog spelling and the app spelling of a screen land on the same route', () => {
    expect(checklistTarget('/guard', null)).toBe('/security');
    expect(checklistTarget('security', null)).toBe('/security');
    expect(checklistTarget('/security/', null)).toBe('/security');
    expect(checklistTarget('/voice', '/call')).toBe('/call');
    expect(checklistTarget('/voice', '/conversations/0')).toBe('/conversations/0');
    expect(checklistTarget('/voice', null)).toBeNull();
    expect(checklistTarget('/nowhere', '/call')).toBeNull();
    expect(checklistTarget(null, '/call')).toBeNull();
  });
});
