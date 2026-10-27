import type { Observable } from 'rxjs';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { SearchKind, SearchScope } from '@/core/types';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { cameraService } from '@/core/services/camera.service';
import { notificationService } from '@/core/services/notification.service';
import {
  gatedSegment,
  mapSegment,
  type PageSegment,
  type SegmentWindow,
  type SourceGate,
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
  listPages,
  projectSearch,
  projectTasksPage,
  taskHit,
  type PagedViewSpec,
} from './view-cache';

const NO_COUNTS = { done: 0, total: 0, closed: 0 };

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

export function searchSegments(scope: SearchScope, gate: SourceGate): HitSegment[] {
  if (scope.words.length === 0) return [];
  return SEGMENTS.filter((spec) => scope.kinds.includes(spec.kind)).map((spec) =>
    gatedSegment(spec.open(scope), spec.module, gate)
  );
}

export function searchPages(gate: SourceGate): PagedViewSpec<SegmentWindow> {
  return listPages<ISearchHitCacheRow>({
    key: VIEW_CACHE_KEYS.commandSearch,
    segments: (scope) => {
      const parsed = parseSearchScope(scope);
      return parsed ? searchSegments(parsed, gate) : [];
    },
    project: ({ page }, scope) => projectSearch(page, scope, parseSearchScope(scope)?.words ?? []),
  });
}

export function notificationPages(unread: Observable<number>): PagedViewSpec<SegmentWindow> {
  return listPages({
    key: VIEW_CACHE_KEYS.notificationFeed,
    warm: [NOTIFICATION_FEED_SCOPE],
    segments: (_scope, ctx) => [notificationService.feedSegment(ctx.userId)],
    extra: () => ({ unread }),
    project: (values, scope) => projectNotificationFeed(values, scope),
  });
}

export function projectTaskPages(gate: SourceGate): PagedViewSpec<SegmentWindow> {
  return listPages({
    key: VIEW_CACHE_KEYS.projectTasks,
    segments: (scope) => [gatedSegment(projectTaskService.doneSegment(scope), PRODUCTIVITY, gate)],
    extra: (scope) => ({
      open: gate.of(PRODUCTIVITY, projectTaskService.observeOpenForProject(scope), []),
      counts: gate.of(PRODUCTIVITY, projectTaskService.observeProgress(scope), NO_COUNTS),
    }),
    project: ({ open, page, counts }, scope) =>
      projectTasksPage({ open, done: page, counts }, scope),
  });
}
