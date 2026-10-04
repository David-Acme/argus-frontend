import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLE_KEYS } from '@/core/types/sync.type';
import type { UserRole } from '@/core/types';
import { hasAccess, sessionAccessForRole, type Permission } from '@/shared/libs/role-access';

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

function roleMasks(): Map<string, Set<UserRole>> {
  const masks = roleAccess.matchAll(/inline constexpr std::uint8_t (\w+)\s*=\s*([^;]+);/g);
  return new Map(
    [...masks].map(([, name = '', body = '']) => [
      name,
      new Set([...body.matchAll(/roleBit\(UserRole::(\w+)\)/g)].map(([, role = '']) => role.toLowerCase() as UserRole)),
    ])
  );
}

function sessionRoutes(): Map<string, Set<UserRole>> {
  const masks = roleMasks();
  const start = roleAccess.indexOf('kSessionAccess');
  const block = start === -1 ? '' : roleAccess.slice(start, roleAccess.indexOf('}};', start));
  const rows = block.matchAll(/\{\.path = "([^"]+)", \.method = drogon::(\w+), \.roles = ([^}]+)\}/g);
  return new Map(
    [...rows].map(([, path = '', method = '', roles = '']) => {
      const named = masks.get(roles.trim());
      const inline = [...roles.matchAll(/roleBit\(UserRole::(\w+)\)/g)].map(([, role = '']) => role.toLowerCase() as UserRole);
      return [`${method} ${path}`, new Set(named ?? inline)];
    })
  );
}

describe('session access mirrors the backend kSessionAccess', () => {
  const routes = sessionRoutes();

  test('the parser sees the three session routes', () => {
    expect([...routes.keys()].sort()).toEqual([
      'Delete /auth/sessions',
      'Delete /auth/sessions/{id}',
      'Get /auth/sessions',
    ]);
  });

  for (const role of ROLES) {
    test(`${role} reads and revokes its own sessions exactly as the backend allows`, () => {
      const allowed = (route: string) => role === 'owner' || (routes.get(route)?.has(role) ?? false);
      expect(sessionAccessForRole(role)).toEqual({
        view: allowed('Get /auth/sessions'),
        revoke: allowed('Delete /auth/sessions') && allowed('Delete /auth/sessions/{id}'),
      });
    });
  }
});
