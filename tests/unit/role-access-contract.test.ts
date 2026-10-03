import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLE_KEYS } from '@/core/types/sync.type';
import type { UserRole } from '@/core/types';
import { hasAccess, type Permission } from '@/shared/libs/role-access';

const backend = join(import.meta.dir, '../../../backend/packages');
const roleAccess = readFileSync(join(backend, 'lib/auth/src/auth/role-access.hxx'), 'utf8');
const tableNames = readFileSync(join(backend, 'contracts/sync/src/sync/table-name.hxx'), 'utf8');

const PERMISSIONS: readonly Permission[] = ['read', 'create', 'update', 'delete'];
const ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

function wireTableNames(): Map<string, string> {
  const pairs = tableNames.matchAll(/case TableName::(\w+):\s*return "(\w+)";/g);
  return new Map([...pairs].map(([, symbol = '', wire = '']) => [symbol, wire]));
}

function permissionSets(): Map<string, Permission[]> {
  const sets = roleAccess.matchAll(/inline const PermSet (\w+)\{([^}]*)\}/g);
  return new Map(
    [...sets].map(([, name = '', body = '']) => [
      name,
      [...body.matchAll(/RolePermission::(\w+)/g)].map(([, perm = '']) => perm.toLowerCase() as Permission),
    ])
  );
}

function backendTable(): Map<UserRole, Map<string, Permission[]>> {
  const wire = wireTableNames();
  const sets = permissionSets();
  const start = roleAccess.indexOf('kTableAccess');
  const block = roleAccess.slice(start, roleAccess.indexOf('};', start));
  const table = new Map<UserRole, Map<string, Permission[]>>();
  for (const [, role = '', body = ''] of block.matchAll(/\{UserRole::(\w+),\s*\{([\s\S]*?)\}\}\}?,?\s*(?=\{UserRole|$)/g)) {
    const entries = [...body.matchAll(/\{TableName::(\w+), (\w+)\}/g)].map(
      ([, symbol = '', set = '']) => [wire.get(symbol) ?? symbol, sets.get(set) ?? []] as const
    );
    table.set(role.toLowerCase() as UserRole, new Map(entries));
  }
  return table;
}

describe('role access mirrors the backend kTableAccess', () => {
  const backendAccess = backendTable();

  test('the parser sees every non-owner role', () => {
    expect([...backendAccess.keys()].sort()).toEqual(['guard', 'guest', 'resident']);
  });

  for (const role of ROLES) {
    test(`${role} has the backend's permissions on every synced table`, () => {
      const app = SYNC_TABLE_KEYS.flatMap((table) =>
        PERMISSIONS.filter((perm) => hasAccess(role, table, perm)).map((perm) => `${table}:${perm}`)
      );
      const server =
        role === 'owner'
          ? SYNC_TABLE_KEYS.flatMap((table) => PERMISSIONS.map((perm) => `${table}:${perm}`))
          : SYNC_TABLE_KEYS.flatMap((table) =>
              (backendAccess.get(role)?.get(table) ?? []).map((perm) => `${table}:${perm}`)
            );
      expect(app.sort()).toEqual(server.sort());
    });
  }
});
