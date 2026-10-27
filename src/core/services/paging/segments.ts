import { combineLatest, of, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { KeysetPage, KeysetWindow } from '@/core/types';

export type PageSegment<T> = {
  observe: (window: KeysetWindow) => Observable<KeysetPage<T>>;
  next: (window: KeysetWindow) => Promise<KeysetWindow>;
  any: () => Observable<boolean>;
  exists: () => Promise<boolean>;
};

export type SegmentWindow = readonly KeysetWindow[];

export const FIRST_SEGMENT: SegmentWindow = [{ through: null }];

const EMPTY_PAGE: KeysetPage<never> = { rows: [], hasMore: false };

export const sameKeyset = (left: KeysetWindow, right: KeysetWindow): boolean =>
  left.through?.id === right.through?.id && left.through?.value === right.through?.value;

export const sameSegments = (left: SegmentWindow, right: SegmentWindow): boolean =>
  left.length === right.length &&
  left.every((window, at) => {
    const other = right[at];
    return other !== undefined && sameKeyset(window, other);
  });

export function mapSegment<T, R>(segment: PageSegment<T>, project: (row: T) => R): PageSegment<R> {
  return {
    ...segment,
    observe: (window) =>
      segment
        .observe(window)
        .pipe(map((page) => ({ rows: page.rows.map(project), hasMore: page.hasMore }))),
  };
}

export function observeSegments<T>(
  segments: readonly PageSegment<T>[],
  windows: SegmentWindow
): Observable<KeysetPage<T>> {
  const opened = windows.slice(0, segments.length);
  if (opened.length === 0) return of(EMPTY_PAGE);
  const pages = opened.map((window, at) => segments[at]?.observe(window) ?? of(EMPTY_PAGE));
  const later = segments.slice(opened.length).map((segment) => segment.any());
  return combineLatest([
    combineLatest(pages),
    later.length > 0 ? combineLatest(later) : of([]),
  ]).pipe(
    map(([loaded, ahead]) => ({
      rows: loaded.flatMap((page) => page.rows),
      hasMore: (loaded[loaded.length - 1]?.hasMore ?? false) || ahead.some(Boolean),
    }))
  );
}

async function nextFilled<T>(
  segments: readonly PageSegment<T>[],
  from: number
): Promise<number | null> {
  for (let at = from; at < segments.length; at += 1) {
    if (await segments[at]?.exists()) return at;
  }
  return null;
}

export async function nextSegments<T>(
  segments: readonly PageSegment<T>[],
  windows: SegmentWindow
): Promise<SegmentWindow> {
  const at = windows.length - 1;
  const segment = segments[at];
  const last = windows[at];
  if (!segment || !last) return windows;
  const next = await segment.next(last);
  if (!sameKeyset(next, last)) return [...windows.slice(0, at), next];
  const filled = await nextFilled(segments, at + 1);
  if (filled === null) return windows;
  return [...windows, ...Array.from({ length: filled - at }, () => ({ through: null }))];
}

export type SourceGate = {
  of: <T>(moduleId: string, source: Observable<T>, empty: T) => Observable<T>;
};

export function gatedSegment<T>(
  segment: PageSegment<T>,
  module: string | null,
  gate: SourceGate
): PageSegment<T> {
  if (module === null) return segment;
  return {
    ...segment,
    observe: (window) => gate.of(module, segment.observe(window), EMPTY_PAGE),
    any: () => gate.of(module, segment.any(), false),
  };
}
