import { describe, expect, test } from 'bun:test';
import type { ISynchronizedDto, ISynchronizedResponse } from '@/core/interfaces';
import { ModuleEngine } from '@/core/services/modules/module-engine';
import { syncTablesOf } from '@/core/services/modules/module-state';
import { advanceRowCursors, buildSyncDto, collectPageRows, withoutTables } from '@/core/services/sync/sync-cursor';
import type { ModuleCatalog, SyncCursors, SyncTableKey } from '@/core/types';
import { moduleRecord } from '@tests/support/access-fixtures';

type Row = { id: number; createdAt: number; name: string };

type AuditEntry = { id: number; table: SyncTableKey; recordId: number; name: string };

const TABLES: SyncTableKey[] = ['camera', 'zone', 'reminder'];

const MODULE_TABLES = new Set<SyncTableKey>(syncTablesOf(['surveillance']));

class Server {
  enabled = true;
  readonly rows = new Map<SyncTableKey, Row[]>(TABLES.map((table) => [table, []]));
  readonly audit: AuditEntry[] = [];
  private clock = 1000;
  private auditId = 0;

  create(table: SyncTableKey, name: string): number {
    const rows = this.rows.get(table) ?? [];
    const id = rows.length + 1;
    this.clock += 1;
    rows.push({ id, createdAt: this.clock, name });
    this.rows.set(table, rows);
    return id;
  }

  rename(table: SyncTableKey, id: number, name: string): void {
    const row = (this.rows.get(table) ?? []).find((candidate) => candidate.id === id);
    if (!row) return;
    row.name = name;
    this.auditId += 1;
    this.audit.push({ id: this.auditId, table, recordId: id, name });
  }

  private served(table: SyncTableKey): boolean {
    return this.enabled || !MODULE_TABLES.has(table);
  }

  synchronize(dto: ISynchronizedDto): ISynchronizedResponse {
    const response: ISynchronizedResponse = {};
    for (const [key, body] of Object.entries(dto) as [SyncTableKey, NonNullable<ISynchronizedDto[SyncTableKey]>][]) {
      if (!this.served(key)) continue;
      const start = body.created?.startTime ?? 0;
      const startId = Number(body.created?.startId ?? 0);
      const created = (this.rows.get(key) ?? [])
        .filter((row) => row.createdAt > start || (row.createdAt === start && row.id > startId))
        .map((row) => ({ ...row }));
      response[key] = { created, deleted: [] };
    }
    return response;
  }

  auditAfter(lastId: number): { entries: AuditEntry[]; watermark: number } {
    return {
      entries: this.audit.filter((entry) => entry.id > lastId && this.served(entry.table)),
      watermark: this.auditId,
    };
  }
}

class Device {
  cursors: SyncCursors = {};
  auditLastId = 0;
  readonly local = new Map<SyncTableKey, Map<number, Row>>(TABLES.map((table) => [table, new Map()]));

  constructor(private readonly server: Server) {}

  sync(): void {
    const response = this.server.synchronize(buildSyncDto(TABLES, this.cursors));
    const { created, deleted } = collectPageRows(TABLES, response);
    for (const [table, rows] of created) {
      for (const row of rows as Row[]) this.local.get(table)?.set(row.id, { ...row });
    }
    advanceRowCursors(created, deleted, this.cursors);
    const { entries, watermark } = this.server.auditAfter(this.auditLastId);
    for (const entry of entries) {
      const row = this.local.get(entry.table)?.get(entry.recordId);
      if (row) row.name = entry.name;
    }
    this.auditLastId = watermark;
  }

  async dropTables(tables: readonly SyncTableKey[]): Promise<void> {
    this.cursors = withoutTables(this.cursors, tables);
    for (const table of tables) this.local.get(table)?.clear();
    this.sync();
  }

  name(table: SyncTableKey, id: number): string | undefined {
    return this.local.get(table)?.get(id)?.name;
  }
}

const catalogWith = (enabled: boolean): ModuleCatalog => ({
  fetchedAt: 1,
  modules: [moduleRecord({ enabled, lifecycle: enabled ? 'active' : 'disabled' })],
});

function engineFor(device: Device, repull: boolean) {
  let cached: ModuleCatalog | null = null;
  let frame: (info: unknown) => void = () => undefined;
  const engine = new ModuleEngine({
    act: async () => ({ status: 200, ok: true, info: null, errors: null }) as never,
    purges: { read: () => ({}), write: () => undefined },
    dropModuleData: (moduleIds) => (repull ? device.dropTables(syncTablesOf(moduleIds)) : Promise.resolve()),
    cache: { read: () => cached, write: (value) => (cached = value) },
    socket: {
      onFrame: (listener) => {
        frame = listener;
        return () => undefined;
      },
    },
    onRefusal: () => () => undefined,
    now: () => 100,
    language: () => 'es',
  });
  engine.start('7');
  cached = catalogWith(true);
  return { send: (enabled: boolean) => frame({ modules: [{ id: 'surveillance', enabled }] }) };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function runWindow(repull: boolean) {
  const server = new Server();
  const device = new Device(server);
  const camera = server.create('camera', 'Puerta');
  const reminder = server.create('reminder', 'Regar');
  device.sync();
  const modules = engineFor(device, repull);

  server.enabled = false;
  modules.send(false);
  server.rename('camera', camera, 'Puerta principal');
  const added = server.create('camera', 'Patio');
  server.rename('reminder', reminder, 'Regar las plantas');
  device.sync();

  server.enabled = true;
  modules.send(true);
  return { device, camera, added, reminder };
}

describe('a module switched off and on again', () => {
  test('changes made while it was off are on the device after it comes back', async () => {
    const { device, camera, added, reminder } = runWindow(true);
    await settle();
    device.sync();
    expect(device.name('camera', camera)).toBe('Puerta principal');
    expect(device.name('camera', added)).toBe('Patio');
    expect(device.name('reminder', reminder)).toBe('Regar las plantas');
  });

  test('without the re-pull the update made in that window is lost, which is the hole it closes', async () => {
    const { device, camera, reminder } = runWindow(false);
    await settle();
    device.sync();
    expect(device.name('camera', camera)).toBe('Puerta');
    expect(device.name('reminder', reminder)).toBe('Regar las plantas');
  });

  test('the core tables keep their cursors and the module tables are rebuilt by the re-pull', async () => {
    const { device } = runWindow(true);
    await settle();
    expect(device.cursors.reminder?.createdStart).toBeGreaterThan(0);
    expect(device.cursors.camera?.createdStart).toBeGreaterThan(0);
  });
});
