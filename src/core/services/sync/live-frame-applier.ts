import { database } from '@/core/database';
import type { IAuditLogEntry, ISocketEmitDto } from '@/core/interfaces';
import { auditLogProcessorService } from './audit-log-processor.service';
import { emptyLiveAuditHigh, freshLiveAuditEntries, groupLiveEvents } from './live-frame-batch';
import type { ProjectionEpoch } from './projection-epoch';
import { SYNC_LIVE_BUFFER_LIMIT } from './sync-constants';
import type { SyncCursorStore } from './sync-cursor-store';
import { batchPrepared } from './sync-db-utils';
import { errorMessage } from './sync-request-error';
import { prepareSyncRows } from './sync-row-preparation';

export type LiveFrameApplierDeps = {
  epoch: ProjectionEpoch;
  cursors: SyncCursorStore;
  onUserRows: (rows: Record<string, unknown>[] | undefined) => void;
  onUserAudit: (entries: IAuditLogEntry[]) => void;
  onOverflow: () => void;
  onFailure: (message: string) => void;
  requestCatchUp: () => void;
};

export class LiveFrameApplier {
  private ready = false;
  private overflow = false;
  private pending: ISocketEmitDto[] = [];
  private queue: ISocketEmitDto[] = [];
  private flushScheduled = false;
  private applying: Promise<void> = Promise.resolve();
  private auditHigh = emptyLiveAuditHigh();

  constructor(private readonly deps: LiveFrameApplierDeps) {}

  get settled(): Promise<void> {
    return this.applying;
  }

  receive(msg: ISocketEmitDto): void {
    if (this.ready) {
      this.enqueue([msg]);
      return;
    }
    if (this.overflow) return;
    if (this.pending.length >= SYNC_LIVE_BUFFER_LIMIT) {
      this.pending = [];
      this.overflow = true;
      return;
    }
    this.pending.push(msg);
  }

  pause(): void {
    this.ready = false;
    this.overflow = false;
    this.pending = [];
  }

  reset(): void {
    this.pause();
    this.queue = [];
    this.auditHigh = emptyLiveAuditHigh();
  }

  resume(): boolean {
    if (this.overflow) {
      this.pause();
      return false;
    }
    this.ready = true;
    const buffered = this.pending.splice(0);
    if (buffered.length > 0) this.enqueue(buffered);
    return true;
  }

  private enqueue(events: ISocketEmitDto[]): void {
    if (this.queue.length + events.length > SYNC_LIVE_BUFFER_LIMIT) {
      this.queue = [];
      this.pause();
      this.deps.onOverflow();
      return;
    }
    this.queue.push(...events);
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    setTimeout(() => this.flush(), 0);
  }

  private flush(): void {
    this.flushScheduled = false;
    const events = this.queue.splice(0);
    if (events.length === 0) return;
    const epoch = this.deps.epoch.current;
    this.applying = this.applying
      .then(() => this.apply(events, epoch))
      .catch((error: unknown) => {
        this.deps.onFailure(errorMessage(error));
        if (this.deps.epoch.isCurrent(epoch)) this.deps.requestCatchUp();
      });
  }

  private async apply(events: ISocketEmitDto[], epoch: number): Promise<void> {
    if (!this.deps.epoch.isCurrent(epoch)) return;
    const { created, deleted, logs } = groupLiveEvents(events);
    const fresh = freshLiveAuditEntries(logs, this.deps.cursors.loadAudit(), this.auditHigh);
    this.auditHigh = fresh.high;
    const entries = fresh.entries;
    let missing = 0;
    await database.write(async () => {
      if (!this.deps.epoch.isCurrent(epoch)) return;
      await batchPrepared(await prepareSyncRows(created, deleted, 'insert'));
      if (entries.length === 0) return;
      const prepared = await auditLogProcessorService.prepare(entries);
      await batchPrepared(prepared.operations);
      missing = prepared.missing.length;
    });
    if (!this.deps.epoch.isCurrent(epoch)) return;
    this.deps.onUserRows(created.get('user'));
    this.deps.onUserAudit(entries);
    if (missing > 0) this.deps.requestCatchUp();
  }
}
