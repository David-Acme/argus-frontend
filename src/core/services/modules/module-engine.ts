import { readModuleFrame } from '@/core/contracts/modules.contract';
import type { IServiceResponse } from '@/core/interfaces';
import type {
  AppContext,
  LanguageCode,
  ModuleAction,
  ModuleCatalog,
  ModuleJob,
  ModuleRecord,
  ModuleTransition,
  ModuleUninstall,
} from '@/core/types';
import {
  applyFrame,
  catalogOfContext,
  jobTransitions,
  moduleOfApiPath,
  optimisticPatch,
  purgeDecision,
  patchModule,
  sameModules,
  replaceCatalog,
  upsertModule,
  withJob,
} from './module-state';

type Unsubscribe = () => void;

export type ModuleEngineDeps = {
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
  };
  onRefusal: (listener: (path: string) => void) => Unsubscribe;
  now: () => number;
  language: () => LanguageCode;
};

const isRecord = (value: ModuleRecord | ModuleJob): value is ModuleRecord => 'lifecycle' in value;

export class ModuleEngine {
  private session: string | null = null;
  private offs: Unsubscribe[] = [];
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
    this.offs = [this.deps.socket.onFrame((info) => this.receive(info)), this.deps.onRefusal((path) => this.refused(path))];
  }

  stop(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.session = null;
  }

  current(): ModuleCatalog | null {
    return this.deps.cache.read();
  }

  onTransition(listener: (transition: ModuleTransition) => void): Unsubscribe {
    this.transitionListeners.add(listener);
    return () => this.transitionListeners.delete(listener);
  }

  applyContext(context: AppContext): void {
    if (!this.session) return;
    const previous = context.role === 'owner' ? this.current() : null;
    this.write(replaceCatalog(previous, catalogOfContext(context), this.deps.now()));
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
    return result;
  }

  private refused(path: string): void {
    const moduleId = moduleOfApiPath(path);
    if (moduleId) this.write(patchModule(this.current(), moduleId, { enabled: false }));
  }

  private write(next: ModuleCatalog | null): void {
    const previous = this.current();
    if (sameModules(previous, next)) {
      void this.reconcilePurges();
      return;
    }
    this.deps.cache.write(next);
    jobTransitions(previous, next, this.deps.language()).forEach((transition) =>
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
}
