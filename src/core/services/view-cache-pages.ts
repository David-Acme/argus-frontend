import type { Observable } from 'rxjs';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { KeysetPage, KeysetWindow, SearchKind, SearchScope } from '@/core/types';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { cameraService } from '@/core/services/camera.service';
import { notificationService } from '@/core/services/notification.service';
import {
  FIRST_SEGMENT,
  mapSegment,
  nextSegments,
  observeSegments,
  sameKeyset,
  sameSegments,
  type PageSegment,
  type SegmentWindow,
} from '@/core/services/paging';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import { userService } from '@/core/services/user.service';
import { MODULE_IDS, NOTIFICATION_FEED_SCOPE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { parseSearchScope } from '@/shared/libs/text-search';
import {
  cameraHit,
  eventHit,
  personHit,
  projectHit,
  projectNotificationFeed,
  projectSearch,
  startProjection,
  taskHit,
  type PagedViewSpec,
} from './view-cache';

export type SourceGate = {
  of: <T>(moduleId: string, source: Observable<T>, empty: T) => Observable<T>;
};

type HitSegment = PageSegment<ISearchHitCacheRow>;

type SegmentSpec = {
  kind: SearchKind;
  module: string | null;
  open: (scope: SearchScope) => HitSegment;
};

const PRODUCTIVITY = MODULE_IDS.productivity;

const SEGMENTS: readonly SegmentSpec[] = [
  {
    kind: 'event',
    module: PRODUCTIVITY,
    open: ({ words }) => mapSegment(calendarEventService.searchSeries(words), eventHit),
  },
  {
    kind: 'event',
    module: PRODUCTIVITY,
    open: ({ words, since }) =>
      mapSegment(calendarEventService.searchSingles(words, since, true), eventHit),
  },
  {
    kind: 'task',
    module: PRODUCTIVITY,
    open: ({ words }) => mapSegment(projectTaskService.searchOpen(words, true), taskHit),
  },
  {
    kind: 'task',
    module: PRODUCTIVITY,
    open: ({ words }) => mapSegment(projectTaskService.searchOpen(words, false), taskHit),
  },
  {
    kind: 'event',
    module: PRODUCTIVITY,
    open: ({ words, since }) =>
      mapSegment(calendarEventService.searchSingles(words, since, false), eventHit),
  },
  {
    kind: 'project',
    module: PRODUCTIVITY,
    open: ({ words }) => mapSegment(projectService.search(words), projectHit),
  },
  {
    kind: 'person',
    module: null,
    open: ({ words }) => mapSegment(userService.searchActive(words), personHit),
  },
  {
    kind: 'camera',
    module: MODULE_IDS.surveillance,
    open: ({ words }) => mapSegment(cameraService.search(words), cameraHit),
  },
];

const EMPTY_PAGE: KeysetPage<ISearchHitCacheRow> = { rows: [], hasMore: false };

function gated(segment: HitSegment, module: string | null, gate: SourceGate): HitSegment {
  if (module === null) return segment;
  return {
    ...segment,
    observe: (window) => gate.of(module, segment.observe(window), EMPTY_PAGE),
    any: () => gate.of(module, segment.any(), false),
  };
}

export function searchSegments(scope: SearchScope, gate: SourceGate): HitSegment[] {
  if (scope.words.length === 0) return [];
  return SEGMENTS.filter((spec) => scope.kinds.includes(spec.kind)).map((spec) =>
    gated(spec.open(scope), spec.module, gate)
  );
}

export function searchPages(gate: SourceGate): PagedViewSpec<SegmentWindow> {
  const segmentsOf = (scope: string) => {
    const parsed = parseSearchScope(scope);
    return { words: parsed?.words ?? [], segments: parsed ? searchSegments(parsed, gate) : [] };
  };
  return {
    key: VIEW_CACHE_KEYS.commandSearch,
    initial: () => FIRST_SEGMENT,
    open: (scope, window, context) => {
      const { words, segments } = segmentsOf(scope);
      return startProjection(
        {
          sources: () => ({ page: observeSegments(segments, window) }),
          project: (values) => projectSearch(values.page, scope, words),
        },
        context
      );
    },
    extend: (scope, window) => nextSegments(segmentsOf(scope).segments, window),
    same: sameSegments,
  };
}

export function notificationPages(unread: Observable<number>): PagedViewSpec<KeysetWindow> {
  return {
    key: VIEW_CACHE_KEYS.notificationFeed,
    warm: [NOTIFICATION_FEED_SCOPE],
    initial: () => ({ through: null }),
    open: (scope, window, context) =>
      startProjection(
        {
          sources: () => ({
            page: notificationService.observeFeedPage(context.userId, window),
            unread,
          }),
          project: (values) => projectNotificationFeed(values, scope),
        },
        context
      ),
    extend: (_scope, window, context) => notificationService.nextFeedWindow(context.userId, window),
    same: sameKeyset,
  };
}
