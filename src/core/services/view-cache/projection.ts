import { auditTime, combineLatest, type Observable, type ObservedValueOf, type Subscription } from 'rxjs';
import type { ViewCacheKey } from '@/core/types';
import { viewCacheService } from '@/core/services/view-cache.service';

const PROJECTION_REFRESH_MS = 120;

export type ViewWrite =
  | { key: ViewCacheKey; scope?: string; rows: readonly unknown[]; limit?: number }
  | { key: ViewCacheKey; scope?: string; value: unknown };

export type ProjectionContext = { userId: string; now: Date };

export type ProjectionValues<S extends Record<string, Observable<unknown>>> = {
  [K in keyof S]: ObservedValueOf<S[K]>;
};

export type ViewProjection<S extends Record<string, Observable<unknown>>> = {
  sources: (ctx: ProjectionContext) => S;
  project: (values: ProjectionValues<S>, ctx: ProjectionContext) => readonly ViewWrite[];
  tracked?: readonly ViewCacheKey[];
};

export function applyWrites(writes: readonly ViewWrite[], tracked: readonly ViewCacheKey[] = []): void {
  const scopes = new Map<ViewCacheKey, Set<string>>(tracked.map((key) => [key, new Set<string>()]));
  for (const write of writes) {
    if ('rows' in write) {
      viewCacheService.write(write.key, write.rows, write.scope, { limit: write.limit });
    } else {
      viewCacheService.writeValue(write.key, write.value, write.scope);
    }
    if (write.scope != null) scopes.get(write.key)?.add(write.scope);
  }
  for (const [key, kept] of scopes) viewCacheService.retainScopes(key, kept);
}

export function startProjection<S extends Record<string, Observable<unknown>>>(
  projection: ViewProjection<S>,
  ctx: ProjectionContext,
): Subscription {
  return combineLatest(projection.sources(ctx))
    .pipe(auditTime(PROJECTION_REFRESH_MS))
    .subscribe((values) => {
      applyWrites(projection.project(values, { ...ctx, now: new Date() }), projection.tracked);
    });
}
