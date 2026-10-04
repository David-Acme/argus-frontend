import { database } from '@/core/database';
import type { ISynchronizedDto, ISynchronizedResponse } from '@/core/interfaces';
import type { SyncCreatedRows } from '@/core/types';
import { SYNC_MAX_PAGES } from '@/shared/constants';
import {
  buildScopedDto,
  collectScopedPage,
  GRANT_RULES,
  grantsIn,
  hasPending,
  mergePending,
  scopeChunks,
  withoutPending,
  type GrantRule,
  type ScopeCursor,
} from './grant-scope';
import type { ProjectionEpoch } from './projection-epoch';
import type { SyncCursorStore } from './sync-cursor-store';
import { batchPrepared } from './sync-db-utils';
import { prepareSyncRows } from './sync-row-preparation';

export type GrantScopePagerDeps = {
  request: (dto: ISynchronizedDto) => Promise<ISynchronizedResponse>;
  cursors: SyncCursorStore;
  epoch: ProjectionEpoch;
};

export class GrantScopePager {
  constructor(private readonly deps: GrantScopePagerDeps) {}

  remember(created: SyncCreatedRows, userId: string | null): boolean {
    if (!userId) return false;
    const found = grantsIn(created, userId);
    if (!hasPending(found)) return false;
    this.deps.cursors.saveGrants(mergePending(this.deps.cursors.loadGrants(), found));
    return true;
  }

  get pending(): boolean {
    return hasPending(this.deps.cursors.loadGrants());
  }

  async bootstrap(epoch: number): Promise<void> {
    for (const rule of GRANT_RULES) {
      const ids = this.deps.cursors.loadGrants()[rule.scope] ?? [];
      for (const chunk of scopeChunks(ids)) {
        await this.pullChunk(rule, chunk, epoch);
        this.deps.cursors.saveGrants(withoutPending(this.deps.cursors.loadGrants(), rule.scope, chunk));
      }
    }
  }

  private async pullChunk(rule: GrantRule, ids: string[], epoch: number): Promise<void> {
    const cursor: ScopeCursor = {};
    let open = [...rule.tables];
    for (let page = 0; page < SYNC_MAX_PAGES; page++) {
      const response = await this.deps.request(buildScopedDto(open, ids, cursor));
      this.deps.epoch.assert(epoch);
      const result = collectScopedPage(open, response, cursor);
      await database.write(async () => {
        await batchPrepared(await prepareSyncRows(result.created, new Map(), 'upsert'));
      });
      if (result.open.length === 0) return;
      open = result.open;
    }
    throw new Error('Grant scope page limit reached');
  }
}
