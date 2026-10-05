import { readHeartbeat } from '@/core/contracts/heartbeat.contract';
import type { IDeadmanAlarm, IHeartbeat, IHeartbeatRecord, IHeartbeatService } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { log } from '@/core/services/log';
import { storageService } from '@/core/services/storage';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { useAuthStore } from '@/core/stores';
import { HEARTBEAT_REQUEST_TYPE, HEARTBEAT_STORAGE_KEY, SYNC_OPERATION } from '@/shared/constants';
import { pingIntervalMs, planFor } from './heartbeat-plan';

const loadRecord = (): IHeartbeatRecord | null => {
  try {
    const stored = storageService.getObject<IHeartbeatRecord>(HEARTBEAT_STORAGE_KEY);
    if (!stored || typeof stored.receivedAt !== 'number') return null;
    const beat = readHeartbeat(stored.beat);
    return beat ? { beat, receivedAt: stored.receivedAt } : null;
  } catch {
    return null;
  }
};

export class HeartbeatEngine implements IHeartbeatService {
  private record: IHeartbeatRecord | null = loadRecord();
  private readonly listeners = new Set<() => void>();
  private offs: (() => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private lostAt: number | null = null;

  constructor(private readonly alarm: IDeadmanAlarm) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.offs = [
      synchronizeService.on(SYNC_OPERATION.Heartbeat, (frame) => {
        const beat = readHeartbeat(frame.info);
        if (beat) void this.receive(beat);
      }),
      synchronizeService.onConnect(() => {
        this.lostAt = null;
        this.restartTimer();
        this.notify();
      }),
      synchronizeService.onDisconnect(() => {
        this.lostAt ??= Date.now();
        this.stopTimer();
        this.notify();
      }),
      useAuthStore.subscribe((state) => {
        if (state.status === 'signed-out') void this.stop();
      }),
    ];
    if (synchronizeService.isSocketConnected) this.restartTimer();
    else this.lostAt = Date.now();
  }

  async stop(): Promise<void> {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.started = false;
    this.stopTimer();
    this.record = null;
    this.lostAt = null;
    try {
      storageService.remove(HEARTBEAT_STORAGE_KEY);
    } catch {
    }
    this.notify();
    await this.alarm.apply({ kind: 'disarm' });
  }

  async receive(beat: IHeartbeat, receivedAt = Date.now()): Promise<void> {
    const previous = this.record;
    this.record = { beat, receivedAt };
    try {
      storageService.setObject(HEARTBEAT_STORAGE_KEY, this.record);
    } catch {
    }
    if (this.timer && pingIntervalMs(previous) !== pingIntervalMs(this.record)) this.restartTimer();
    this.notify();
    try {
      await this.alarm.apply(planFor(this.record));
    } catch (error) {
      log.error('watchdog', 'the local alarm could not be rescheduled', error);
    }
  }

  async checkNow(): Promise<boolean> {
    const result = await httpService.get<unknown>('/sync/heartbeat');
    const beat = result.ok ? readHeartbeat(result.info) : null;
    if (!beat) return false;
    await this.receive(beat);
    return true;
  }

  last(): IHeartbeatRecord | null {
    return this.record;
  }

  disconnectedAt(): number | null {
    return this.lostAt;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private ping(): void {
    synchronizeService.send(HEARTBEAT_REQUEST_TYPE);
  }

  private restartTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => this.ping(), pingIntervalMs(this.record));
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
