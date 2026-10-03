import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as voice from '@/features/voice/constants/voice';
import { SYNC_TABLE_KEYS } from '@/core/types/sync.type';
import { ARGUS_DEFAULT_ROUTE_PORTS } from '@/shared/constants/net.constant';
import { SYNC_OPERATION } from '@/shared/constants/sync.constant';

const backend = join(import.meta.dir, '../../../backend');
const read = (path: string) => readFileSync(join(backend, path), 'utf8');

describe('wire vocabulary matches the backend', () => {
  test('SyncOperation values', () => {
    const header = read('packages/contracts/sync/src/sync/sync-operation.hxx');
    const body = header.slice(header.indexOf('enum class SyncOperation'), header.indexOf('};'));
    const backendOps = Object.fromEntries(
      [...body.matchAll(/(\w+) = (\d+)/g)].map(([, name, value]) => [name, Number(value)])
    );
    expect(backendOps).toEqual(SYNC_OPERATION);
  });

  test('every synced table name exists in the backend TableName', () => {
    const wire = [...read('packages/contracts/sync/src/sync/table-name.hxx').matchAll(/return "(\w+)";/g)].map(
      ([, name]) => name
    );
    expect(SYNC_TABLE_KEYS.filter((table) => !wire.includes(table))).toEqual([]);
  });

  test('voice frame types are the ones the sync relay sends and accepts', () => {
    const relay = read('services/sync/src/feature/transport/infra/voice-grpc-relay.cc');
    const backendTypes = new Set([...relay.matchAll(/"(voice:[a-z_]+)"/g)].map(([, type]) => type));
    const appTypes = new Set(
      Object.entries(voice)
        .filter(([name, value]) => name.endsWith('_TYPE') && typeof value === 'string')
        .map(([, value]) => value as string)
    );
    expect([...appTypes].sort()).toEqual([...backendTypes].sort());
  });

  test('default route ports match each service listener', () => {
    const listenerPort = (unit: string): number | null => {
      const config = read(`services/${unit}/config.toml.example`);
      const section = config.split(/^\[/m).find((part) => part.startsWith(`${unit}]`));
      const port = section?.match(/^port = (\d+)/m);
      return port ? Number(port[1]) : null;
    };
    const backendPorts: Record<string, number> = {};
    for (const line of read('scripts/lib/route-baseline.txt').split('\n').filter(Boolean)) {
      const [unit, , path] = line.split('\t');
      const segment = path.replace(/^\//, '').split('/')[0];
      const port = segment === 'health' ? null : listenerPort(unit);
      if (port !== null) backendPorts[segment] = port;
    }
    expect(ARGUS_DEFAULT_ROUTE_PORTS).toEqual(backendPorts);
  });
});
