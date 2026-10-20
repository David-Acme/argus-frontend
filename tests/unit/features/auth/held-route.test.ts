import { describe, expect, test } from 'bun:test';
import { readContext } from '@/core/contracts/context.contract';
import { accessOf } from '@/core/services/context/context-state';
import { accessView } from '@/shared/libs/capabilities';
import { holdRoute, routeToRestore, type HeldRoute } from '@/features/auth/model/held-route';
import { ownerContext } from '../../../e2e/support/fake-argus';

const access = (enabled: Record<string, boolean> = {}) => {
  const context = readContext(ownerContext(enabled));
  if (!context) throw new Error('the fake context did not parse');
  return accessOf(context, 0);
};

const known = accessView(access(), 'owner');
const productivityOff = accessView(access({ productivity: false }), 'owner');
const unknown = accessView(null, 'owner');

const held = (path: string): HeldRoute => {
  const holder: HeldRoute = { path: null };
  holdRoute(holder, path);
  return holder;
};

describe('a requested route sent home before the app could open it is restored', () => {
  test('home itself is never held', () => {
    expect(held('/').path).toBeNull();
    expect(held('/agenda').path).toBe('/agenda');
  });

  test('nothing is restored until the context is known, and then the held route is', () => {
    const holder = held('/cameras/3');
    expect(routeToRestore(holder, '/', unknown)).toBeNull();
    expect(holder.path).toBe('/cameras/3');
    expect(routeToRestore(holder, '/', known)).toBe('/cameras/3');
    expect(holder.path).toBeNull();
  });

  test('a route the context refuses is dropped, not restored', () => {
    expect(routeToRestore(held('/agenda'), '/', productivityOff)).toBeNull();
  });

  test('a person who already moved elsewhere is not pulled back', () => {
    const holder = held('/agenda');
    expect(routeToRestore(holder, '/projects', known)).toBeNull();
    expect(holder.path).toBeNull();
  });
});
