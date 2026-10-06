import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UserRole } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { coreCapabilities } from '@/shared/libs/capabilities';
import { serverCapabilities } from './support/access-fixtures';

const authSource = join(import.meta.dir, '../../../backend/packages/lib/auth/src/auth');
const readSource = (name: string) => {
  const path = join(authSource, name);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

const capabilityHeader = readSource('capability.hxx');
const roleAccess = readSource('role-access.hxx');
const moduleSnapshot = readSource('module-snapshot.hxx');

const ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

type Mask = { roles: ReadonlySet<UserRole>; baseline: boolean };

function masks(): Map<string, Mask> {
  const bodies = new Map(
    [...`${roleAccess}\n${capabilityHeader}`.matchAll(/inline constexpr RoleMask (\w+)\s*=\s*([^;]+);/g)].map(
      ([, name = '', body = '']) => [name, body] as const
    )
  );
  const resolve = (name: string, seen: ReadonlySet<string> = new Set()): Mask => {
    const body = bodies.get(name);
    if (body === undefined || seen.has(name)) return { roles: new Set(), baseline: false };
    const roles = new Set<UserRole>(
      [...body.matchAll(/UserRole::(\w+)/g)].map(([, role = '']) => role.toLowerCase() as UserRole)
    );
    let baseline = /\bkBaselineBit\b/.test(body);
    for (const [reference] of body.matchAll(/\bk(?!BaselineBit)\w+/g)) {
      const inner = resolve(reference, new Set([...seen, name]));
      inner.roles.forEach((role) => roles.add(role));
      baseline ||= inner.baseline;
    }
    return { roles, baseline };
  };
  return new Map([...bodies.keys()].map((name) => [name, resolve(name)]));
}

function moduleNames(): Map<string, string> {
  return new Map(
    [...`${moduleSnapshot}\n${roleAccess}`.matchAll(/inline constexpr std::string_view (k\w+Module) = "([a-z-]+)";/g)].map(
      ([, name = '', id = '']) => [name, id]
    )
  );
}

type Spec = { id: string; module: string; mask: Mask };

function specs(): Spec[] {
  const table = masks();
  const names = moduleNames();
  return [
    ...capabilityHeader.matchAll(/\{\.id = "([a-z.]+)", \.module = (\w+), \.roles = (\w+)\}/g),
  ].map(([, id = '', module = '', mask = '']) => ({
    id,
    module: names.get(module) ?? module,
    mask: table.get(mask) ?? { roles: new Set(), baseline: false },
  }));
}

function granted(role: UserRole, modules: readonly string[], roleActive: boolean): string[] {
  return specs()
    .filter(
      (spec) =>
        spec.mask.roles.has(role) &&
        (roleActive || spec.mask.baseline) &&
        (spec.module === 'core' || modules.includes(spec.module))
    )
    .map((spec) => spec.id);
}

const present = specs().length > 0;

describe.skipIf(!present)('capabilities mirror the backend role_access table', () => {
  test('the app names exactly the capabilities the backend knows', () => {
    expect((Object.values(CAPABILITY) as string[]).sort()).toEqual(specs().map((spec) => spec.id).sort());
  });

  for (const role of ROLES) {
    test(`${role} is granted what the backend grants with every module on`, () => {
      expect(serverCapabilities(role).sort()).toEqual(granted(role, ['surveillance', 'productivity'], true).sort());
    });

    test(`${role} is granted what the backend grants with only one module on`, () => {
      for (const only of ['surveillance', 'productivity']) {
        const active = role !== 'guard' || only === 'surveillance';
        const expected = granted(role, [only], active).sort();
        const fixture = active ? serverCapabilities(role, [only]) : granted(role, [only], false);
        expect(fixture.sort()).toEqual(expected);
      }
    });

    test(`${role} keeps the core capabilities the app assumes before the context arrives`, () => {
      expect([...(coreCapabilities(role) as readonly string[])].sort()).toEqual(granted(role, [], true).sort());
    });
  }

  test('an inactive role keeps only the baseline capabilities', () => {
    const baseline = specs().filter((spec) => spec.mask.baseline).map((spec) => spec.id);
    expect(baseline).toContain(CAPABILITY.safetyPanic);
    expect(baseline).toContain(CAPABILITY.remindersWrite);
    expect(baseline).not.toContain(CAPABILITY.assistantVoice);
    expect(granted('guard', ['productivity'], false).sort()).toEqual(
      baseline.filter((id) => specs().find((spec) => spec.id === id)?.mask.roles.has('guard')).sort()
    );
  });
});
