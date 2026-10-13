import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { backendPath } from '@tests/support/backend-dir';
import { SYNC_OPERATION } from '@/shared/constants';
import { RESOURCE_DOMAINS, RESOURCE_SCOPES } from '@/shared/constants';

const backend = backendPath('packages');
const header = readFileSync(join(backend, 'contracts/sync/src/sync/resource-change.hxx'), 'utf8');
const operations = readFileSync(join(backend, 'contracts/sync/src/sync/sync-operation.hxx'), 'utf8');

const wireNames = (enumName: string): string[] =>
  [...header.matchAll(new RegExp(`case ${enumName}::(\\w+):\\s*return "(\\w+)";`, 'g'))].map(
    ([, , wire = '']) => wire
  );

describe('the resource vocabulary mirrors the backend contract', () => {
  test('the domains match resource-change.hxx, in its order', () => {
    expect(wireNames('ResourceDomain')).toEqual([...RESOURCE_DOMAINS]);
  });

  test('the scopes match resource-change.hxx, in its order', () => {
    expect(wireNames('ResourceScope')).toEqual([...RESOURCE_SCOPES]);
  });

  test('the operation keeps its wire number', () => {
    expect(operations).toContain('ResourceChanged = 14');
    expect(SYNC_OPERATION.ResourceChanged).toBe(14);
  });
});
