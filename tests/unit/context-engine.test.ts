import { describe, expect, test } from 'bun:test';
import { ContextEngine, type ContextEngineDeps } from '@/core/services/context/context-engine';
import { accessOf, isStaleContext, withModuleOff } from '@/core/services/context/context-state';
import type { AppAccess, AppContext } from '@/core/types';
import { accessFor } from './support/access-fixtures';

const wire = (userId = 7, extra: Record<string, unknown> = {}) => ({
  userId,
  role: 'resident',
  roleActive: true,
  capabilities: ['camera.view'],
  roles: [],
  modules: [
    { id: 'core', name: 'Núcleo', roles: [], enabled: true, lifecycle: 'active', dataPurgedAt: null },
    { id: 'surveillance', name: 'Vigilancia', roles: ['guard'], enabled: true, lifecycle: 'active', dataPurgedAt: null },
  ],
  ...extra,
});

type Harness = {
  engine: ContextEngine;
  cache: { value: AppAccess | null };
  applied: AppContext[];
  initial: (info: unknown) => void;
  update: (info: unknown) => void;
  refuse: (path: string) => void;
  changes: AppAccess[];
};

function harness(cached: AppAccess | null = null): Harness {
  const listeners: Record<string, (value?: unknown) => void> = {};
  const h = { cache: { value: cached }, applied: [], changes: [] } as unknown as Harness;
  const on = (name: string) => (listener: (value?: unknown) => void) => {
    listeners[name] = listener;
    return () => delete listeners[name];
  };
  const deps: ContextEngineDeps = {
    cache: { read: () => h.cache.value, write: (access) => (h.cache.value = access) },
    modules: {
      applyContext: (context) => h.applied.push(context),
      moduleOfPath: (path) => (path.startsWith('/camera') ? 'surveillance' : null),
    },
    socket: { onInitialInfo: on('initial'), onContextUpdate: on('update') },
    onRefusal: on('refusal') as ContextEngineDeps['onRefusal'],
    now: () => 500,
  };
  h.engine = new ContextEngine(deps);
  h.engine.onChange((access) => h.changes.push(access));
  h.initial = (info) => listeners.initial?.(info);
  h.update = (info) => listeners.update?.(info);
  h.refuse = (path) => listeners.refusal?.(path);
  return h;
}

describe('context engine', () => {
  test('paints the cached context before the socket says anything', () => {
    const cached = { ...accessFor('resident'), userId: 7 };
    const h = harness(cached);
    h.engine.start('7');
    expect(h.engine.current()).toEqual(cached);
  });

  test('never shows the cached context of another user', () => {
    const h = harness({ ...accessFor('owner'), userId: 3 });
    h.engine.start('7');
    expect(h.engine.current()).toBeNull();
  });

  test('InitialInfo and ContextUpdate both replace the context and hand the modules on', () => {
    const h = harness();
    h.engine.start('7');
    h.initial({ id: 7, role: 'resident', isActive: true, context: wire() });
    expect(h.engine.current()?.capabilities).toEqual(['camera.view']);
    expect(h.engine.current()?.receivedAt).toBe(500);
    expect(h.applied).toHaveLength(1);
    h.update(wire(7, { capabilities: ['camera.view', 'camera.talk'] }));
    expect(h.engine.current()?.capabilities).toEqual(['camera.view', 'camera.talk']);
    expect(h.applied).toHaveLength(2);
    expect(h.changes).toHaveLength(2);
  });

  test('the same context again keeps the cached value and only tells the modules', () => {
    const h = harness();
    h.engine.start('7');
    h.initial({ id: 7, role: 'resident', isActive: true, context: wire() });
    const first = h.cache.value;
    h.update(wire());
    expect(h.cache.value).toBe(first);
    expect(h.applied).toHaveLength(2);
  });

  test('a frame without a context, for another user or malformed is ignored', () => {
    const h = harness();
    h.engine.start('7');
    h.initial({ id: 7, role: 'resident', isActive: true });
    h.update(wire(9));
    h.update({ nonsense: true });
    expect(h.engine.current()).toBeNull();
    expect(h.applied).toHaveLength(0);
  });

  test('an older versioned context is dropped and a newer one wins', () => {
    const h = harness();
    h.engine.start('7');
    h.update(wire(7, { version: 5, capabilities: ['a'] }));
    h.update(wire(7, { version: 4, capabilities: ['b'] }));
    expect(h.engine.current()?.capabilities).toEqual(['a']);
    h.update(wire(7, { version: 6, capabilities: ['c'] }));
    expect(h.engine.current()?.capabilities).toEqual(['c']);
    h.update(wire(7, { capabilities: ['d'] }));
    expect(h.engine.current()?.capabilities).toEqual(['d']);
  });

  test('a MODULE_DISABLED refusal turns that module off in the meantime', () => {
    const h = harness();
    h.engine.start('7');
    h.update(wire());
    h.refuse('/camera/overview');
    const surveillance = h.engine.current()?.modules.find((module) => module.id === 'surveillance');
    expect(surveillance?.enabled).toBe(false);
    expect(surveillance?.lifecycle).toBe('disabled');
    h.refuse('/auth/status');
    expect(h.engine.current()?.modules.find((module) => module.id === 'core')?.enabled).toBe(true);
  });

  test('stops listening on stop', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.stop();
    h.update(wire());
    expect(h.engine.current()).toBeNull();
    expect(h.engine.started).toBe(false);
  });
});

describe('context state', () => {
  test('staleness only compares the same user and known versions', () => {
    const access = { ...accessFor('owner'), version: 5 };
    expect(isStaleContext(access, { userId: 1, version: 4 })).toBe(true);
    expect(isStaleContext(access, { userId: 1, version: 5 })).toBe(false);
    expect(isStaleContext(access, { userId: 2, version: 1 })).toBe(false);
    expect(isStaleContext(access, { userId: 1, version: null })).toBe(false);
    expect(isStaleContext(null, { userId: 1, version: 1 })).toBe(false);
  });

  test('turning a module off is a no-op when it was already off', () => {
    const access = accessFor('owner', { modules: [] });
    expect(withModuleOff(access, 'surveillance')).toBe(access);
    expect(withModuleOff(null, 'surveillance')).toBeNull();
  });

  test('accessOf keeps the fields the screens read and stamps the arrival', () => {
    const { receivedAt: _unused, ...rest } = accessFor('guest');
    expect(accessOf({ ...rest, ownerCatalog: null }, 9).receivedAt).toBe(9);
  });
});
