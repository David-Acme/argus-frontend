import { readModuleFrame } from '@/core/contracts/modules.contract';
import type { IServiceResponse } from '@/core/interfaces';
import type {
  ModuleAction,
  ModuleCatalog,
  ModuleJob,
  ModuleRecord,
  ModuleTransition,
  ModuleUninstall,
} from '@/core/types';
import {
  applyFrame,
  jobTransitions,
  moduleOfApiPath,
  needsPolling,
  optimisticPatch,
  purgeDecision,
  patchModule,
  replaceCatalog,
  unsupportedCatalog,
  upsertModule,
  withJob,
} from './module-state';

type Unsubscribe = () => void;

export type ModuleEngineDeps = {
  load: () => Promise<IServiceResponse<ModuleRecord[]>>;
  act: (id: string, action: ModuleAction, body?: ModuleUninstall) => Promise<IServiceResponse<ModuleRecord | ModuleJob>>;
  purges: {
    read: (session: string) => Record<string, number>;
    write: (session: string, stamps: Record<string, number>) => void;
  };
  dropModuleData: (moduleIds: readonly string[]) => Promise<void>;
  cache: {
    read: () => ModuleCatalog | null;
    write: (catalog: ModuleCatalog | null) => void;
  };
  socket: {
    onFrame: (listener: (info: unknown) => void) => Unsubscribe;
    onConnect: (listener: () => void) => Unsubscribe;
    onDisconnect: (listener: () => void) => Unsubscribe;
    isConnected: () => boolean;
  };
  onForeground: (listener: () => void) => Unsubscribe;
  onRefusal: (listener: (path: string) => void) => Unsubscribe;
  setTimer: (run: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  now: () => number;
  pollMs: number;
};

const isRecord = (value: ModuleRecord | ModuleJob): value is ModuleRecord => 'kind' in value;

export class ModuleEngine {
  private session: string | null = null;
  private offs: Unsubscribe[] = [];
  private timer: unknown = null;
  private inFlight: Promise<boolean> | null = null;
  private enabledVersion = -1;
  private purging: Promise<void> | null = null;
  private readonly transitionListeners = new Set<(transition: ModuleTransition) => void>();

  constructor(private readonly deps: ModuleEngineDeps) {}

  get started(): boolean {
    return this.session !== null;
  }

  start(session: string): void {
    if (this.session === session) return;
    this.stop();
    this.session = session;
    this.enabledVersion = -1;
    this.offs = [
      this.deps.socket.onFrame((info) => this.receive(info)),
      this.deps.socket.onConnect(() => void this.refresh()),
      this.deps.socket.onDisconnect(() => this.schedulePoll()),
      this.deps.onForeground(() => void this.refresh()),
      this.deps.onRefusal((path) => this.refused(path)),
    ];
    void this.refresh();
  }

  stop(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.session = null;
    this.inFlight = null;
    this.cancelPoll();
  }

  current(): ModuleCatalog | null {
    return this.deps.cache.read();
  }

  onTransition(listener: (transition: ModuleTransition) => void): Unsubscribe {
    this.transitionListeners.add(listener);
    return () => this.transitionListeners.delete(listener);
  }

  refresh(): Promise<boolean> {
    if (!this.session) return Promise.resolve(false);
    if (this.inFlight) return this.inFlight;
    const session = this.session;
    const run = this.deps
      .load()
      .then((result) => {
        if (this.session !== session) return false;
        if (result.ok && result.info) {
          this.write(replaceCatalog(this.current(), result.info, this.deps.now()));
          return true;
        }
        if (result.status === 404 && !result.errors?.code.startsWith('MODULE_')) {
          this.write(unsupportedCatalog(this.deps.now()));
          return true;
        }
        return false;
      })
      .finally(() => {
        if (this.inFlight === run) this.inFlight = null;
        if (this.session === session) this.schedulePoll();
      });
    this.inFlight = run;
    return run;
  }

  receive(info: unknown): void {
    if (!this.session) return;
    const frame = readModuleFrame(info);
    if (!frame) return;
    if (frame.kind === 'enabled' && frame.version !== null) {
      if (frame.version < this.enabledVersion) return;
      this.enabledVersion = frame.version;
    }
    this.write(applyFrame(this.current(), frame, this.deps.now()));
    this.schedulePoll();
  }

  async act(
    id: string,
    action: ModuleAction,
    body?: ModuleUninstall
  ): Promise<IServiceResponse<ModuleRecord | ModuleJob>> {
    const before = this.current();
    const module = before?.modules.find((candidate) => candidate.id === id);
    if (module) this.write(patchModule(before, id, optimisticPatch(module, action)));
    const result = await this.deps.act(id, action, body);
    if (!result.ok) {
      const latest = this.current();
      if (module) this.write(patchModule(latest, id, module));
      return result;
    }
    if (result.info) {
      this.write(
        isRecord(result.info)
          ? upsertModule(this.current(), result.info, this.deps.now())
          : withJob(this.current(), id, result.info)
      );
    }
    void this.refresh();
    return result;
  }

  private refused(path: string): void {
    const moduleId = moduleOfApiPath(path);
    if (moduleId) this.write(patchModule(this.current(), moduleId, { enabled: false }));
    void this.refresh();
  }

  private write(next: ModuleCatalog | null): void {
    const previous = this.current();
    this.deps.cache.write(next);
    jobTransitions(previous, next).forEach((transition) =>
      this.transitionListeners.forEach((listener) => listener(transition))
    );
    void this.reconcilePurges();
  }

  reconcilePurges(): Promise<void> {
    if (this.purging) return this.purging.then(() => this.reconcilePurges());
    const session = this.session;
    if (!session) return Promise.resolve();
    const decision = purgeDecision(this.current(), this.deps.purges.read(session));
    if (decision.drop.length === 0) return Promise.resolve();
    const run = this.deps
      .dropModuleData(decision.drop)
      .then(() => {
        if (this.session === session) this.deps.purges.write(session, decision.stamps);
      })
      .catch(() => undefined)
      .finally(() => {
        if (this.purging === run) this.purging = null;
      });
    this.purging = run;
    return run;
  }

  private schedulePoll(): void {
    this.cancelPoll();
    if (!this.session || !needsPolling(this.current(), this.deps.socket.isConnected())) return;
    this.timer = this.deps.setTimer(() => {
      this.timer = null;
      void this.refresh();
    }, this.deps.pollMs);
  }

  private cancelPoll(): void {
    if (this.timer !== null) this.deps.clearTimer(this.timer);
    this.timer = null;
  }
}
