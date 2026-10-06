import { readContext } from '@/core/contracts/context.contract';
import type { AppAccess, AppContext } from '@/core/types';
import { accessOf, belongsTo, isStaleContext, sameAccess, withModuleOff } from './context-state';

type Unsubscribe = () => void;

export type ContextEngineDeps = {
  cache: {
    read: () => AppAccess | null;
    write: (access: AppAccess | null) => void;
  };
  modules: {
    applyContext: (context: AppContext) => void;
    moduleOfPath: (path: string) => string | null;
  };
  socket: {
    onInitialInfo: (listener: (info: unknown) => void) => Unsubscribe;
    onContextUpdate: (listener: (info: unknown) => void) => Unsubscribe;
  };
  onRefusal: (listener: (path: string) => void) => Unsubscribe;
  now: () => number;
};

export class ContextEngine {
  private session: string | null = null;
  private offs: Unsubscribe[] = [];
  private readonly listeners = new Set<(access: AppAccess) => void>();

  constructor(private readonly deps: ContextEngineDeps) {}

  get started(): boolean {
    return this.session !== null;
  }

  start(session: string): void {
    if (this.session === session) return;
    this.stop();
    this.session = session;
    this.offs = [
      this.deps.socket.onInitialInfo((info) => this.receive(info)),
      this.deps.socket.onContextUpdate((info) => this.receive(info)),
      this.deps.onRefusal((path) => this.refused(path)),
    ];
  }

  stop(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.session = null;
  }

  current(): AppAccess | null {
    const access = this.deps.cache.read();
    return access !== null && String(access.userId) === this.session ? access : null;
  }

  onChange(listener: (access: AppAccess) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  receive(info: unknown): boolean {
    const session = this.session;
    if (!session) return false;
    const context = readContext(info);
    if (!context || !belongsTo(session, context)) return false;
    if (isStaleContext(this.current(), context)) return false;
    const fresh = accessOf(context, this.deps.now());
    const previous = this.current();
    const access = sameAccess(previous, fresh) && previous ? previous : fresh;
    this.deps.cache.write(access);
    this.deps.modules.applyContext(context);
    this.listeners.forEach((listener) => listener(access));
    return true;
  }

  private refused(path: string): void {
    const moduleId = this.deps.modules.moduleOfPath(path);
    if (!moduleId) return;
    const current = this.current();
    const next = withModuleOff(current, moduleId);
    if (next && next !== current) this.deps.cache.write(next);
  }
}
