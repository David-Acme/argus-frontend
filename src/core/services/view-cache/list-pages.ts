import type { Observable } from 'rxjs';
import type { KeysetPage, ViewCacheKey } from '@/core/types';
import {
  FIRST_SEGMENT,
  nextSegments,
  observeSegments,
  sameSegments,
  type PageSegment,
  type SegmentWindow,
} from '@/core/services/paging';
import type { PagedViewSpec } from './paged-view';
import {
  startProjection,
  type ProjectionContext,
  type ProjectionValues,
  type ViewWrite,
} from './projection';

type Sources = Record<string, Observable<unknown>>;

export type ListPagesSpec<T, E extends Sources> = {
  key: ViewCacheKey;
  warm?: readonly string[];
  segments: (scope: string, ctx: ProjectionContext) => readonly PageSegment<T>[];
  extra?: (scope: string, ctx: ProjectionContext) => E;
  project: (
    values: ProjectionValues<E> & { page: KeysetPage<T> },
    scope: string
  ) => readonly ViewWrite[];
};

const NONE: Sources = {};

export function listPages<T, E extends Sources = Record<never, never>>(
  spec: ListPagesSpec<T, E>
): PagedViewSpec<SegmentWindow> {
  return {
    key: spec.key,
    warm: spec.warm,
    initial: () => FIRST_SEGMENT,
    open: (scope, window, ctx) =>
      startProjection(
        {
          sources: () => ({
            ...((spec.extra?.(scope, ctx) ?? NONE) as E),
            page: observeSegments(spec.segments(scope, ctx), window),
          }),
          project: (values) =>
            spec.project(values as ProjectionValues<E> & { page: KeysetPage<T> }, scope),
        },
        ctx
      ),
    extend: (scope, window, ctx) => nextSegments(spec.segments(scope, ctx), window),
    same: sameSegments,
  };
}
