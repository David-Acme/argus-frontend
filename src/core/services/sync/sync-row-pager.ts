import { database } from '@/core/database';
import type { ISynchronizedDto, ISynchronizedResponse } from '@/core/interfaces';
import type { SyncCreatedRows, SyncCursors, SyncTableKey } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { SYNC_MAX_PAGES, SYNC_PAGE_DELAY_MS } from '@/shared/constants';
import type { ProjectionEpoch } from './projection-epoch';
import {
  advanceRowCursors,
  applyDeletedBaselines,
  buildDeletedBaselineDto,
  buildSyncDto,
  collectPageRows,
  pendingDeletedBaselines,
} from './sync-cursor';
import type { SyncCursorStore } from './sync-cursor-store';
import { batchPrepared } from './sync-db-utils';
import { prepareSyncRows } from './sync-row-preparation';

export type SyncRowPagerDeps = {
  request: (dto: ISynchronizedDto) => Promise<ISynchronizedResponse>;
  cursors: SyncCursorStore;
  epoch: ProjectionEpoch;
  onUserRows: (rows: Record<string, unknown>[] | undefined) => void;
  onCreatedRows: (created: SyncCreatedRows) => void;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class SyncRowPager {
  constructor(private readonly deps: SyncRowPagerDeps) {}

  async ensureDeletedBaselines(cursors: SyncCursors, epoch: number): Promise<void> {
    const keys = pendingDeletedBaselines(cursors);
    if (keys.length === 0) return;

    const response = await this.deps.request(buildDeletedBaselineDto(keys));
    this.deps.epoch.assert(epoch);
    applyDeletedBaselines(keys, response, cursors);
    this.deps.cursors.save(cursors);
  }

  async pageRows(cursors: SyncCursors, epoch: number): Promise<void> {
    let keys: SyncTableKey[] = [...SYNC_TABLE_KEYS];
    for (let page = 0; page < SYNC_MAX_PAGES; page++) {
      const response = await this.deps.request(buildSyncDto(keys, cursors));
      this.deps.epoch.assert(epoch);
      keys = await this.applyPage(keys, response, cursors);
      this.deps.cursors.save(cursors);
      if (keys.length === 0) return;
      await delay(SYNC_PAGE_DELAY_MS);
      this.deps.epoch.assert(epoch);
    }
    throw new Error('Synchronization page limit reached');
  }

  private async applyPage(
    keys: SyncTableKey[],
    response: ISynchronizedResponse,
    cursors: SyncCursors
  ): Promise<SyncTableKey[]> {
    const { created, deleted } = collectPageRows(keys, response);
    await database.write(async () => {
      await batchPrepared(await prepareSyncRows(created, deleted, 'upsert'));
    });
    this.deps.onUserRows(created.get('user'));
    this.deps.onCreatedRows(created);
    return advanceRowCursors(created, deleted, cursors);
  }
}
