import type { Subscription } from 'rxjs';
import type { ViewCacheKey } from '@/core/types';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { ProjectionContext } from './projection';

export type PagedViewSpec<W> = {
  key: ViewCacheKey;
  warm?: readonly string[];
  initial: (scope: string, ctx: ProjectionContext) => W;
  open: (scope: string, window: W, ctx: ProjectionContext) => Subscription;
  extend: (scope: string, window: W, ctx: ProjectionContext) => Promise<W>;
  same: (left: W, right: W) => boolean;
};

type PagedEntry<W> = {
  window: W;
  subscription: Subscription;
  holders: number;
  extending: Promise<boolean> | null;
};

export interface IPagedView {
  watch(scope: string): void;
  release(scope: string): void;
  extend(scope: string): Promise<boolean>;
  stop(): void;
}

export class PagedView<W> implements IPagedView {
  private readonly entries = new Map<string, PagedEntry<W>>();
  private readonly spec: PagedViewSpec<W>;
  private readonly ctx: ProjectionContext;

  constructor(spec: PagedViewSpec<W>, ctx: ProjectionContext) {
    this.spec = spec;
    this.ctx = ctx;
    for (const scope of spec.warm ?? []) this.ensure(scope);
  }

  watch(scope: string): void {
    const entry = this.ensure(scope);
    entry.holders += 1;
    viewCacheService.retainScopes(this.spec.key, new Set(this.entries.keys()));
  }

  release(scope: string): void {
    const entry = this.entries.get(scope);
    if (!entry) return;
    entry.holders = Math.max(0, entry.holders - 1);
    if (entry.holders > 0) return;
    if (this.spec.warm?.includes(scope)) {
      this.reopen(scope, entry, this.spec.initial(scope, this.ctx));
      return;
    }
    entry.subscription.unsubscribe();
    this.entries.delete(scope);
  }

  extend(scope: string): Promise<boolean> {
    const entry = this.entries.get(scope);
    if (!entry) return Promise.resolve(false);
    if (entry.extending) return entry.extending;
    const task = this.spec
      .extend(scope, entry.window, this.ctx)
      .then((window) => {
        const current = this.entries.get(scope);
        if (current === entry && !this.spec.same(window, entry.window))
          this.reopen(scope, entry, window);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        entry.extending = null;
      });
    entry.extending = task;
    return task;
  }

  stop(): void {
    for (const entry of this.entries.values()) entry.subscription.unsubscribe();
    this.entries.clear();
  }

  private ensure(scope: string): PagedEntry<W> {
    const existing = this.entries.get(scope);
    if (existing) return existing;
    const window = this.spec.initial(scope, this.ctx);
    const entry: PagedEntry<W> = {
      window,
      subscription: this.spec.open(scope, window, this.ctx),
      holders: 0,
      extending: null,
    };
    this.entries.set(scope, entry);
    return entry;
  }

  private reopen(scope: string, entry: PagedEntry<W>, window: W): void {
    const next = this.spec.open(scope, window, this.ctx);
    entry.subscription.unsubscribe();
    entry.subscription = next;
    entry.window = window;
  }
}
