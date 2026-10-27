import { combineLatest, of, type Observable, type Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import type { KeysetWindow } from '@/core/types';
import { sameKeyset } from '@/core/services/paging';
import { projectTaskService } from '@/core/services/project-task.service';
import { MODULE_IDS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { weekOf } from '@/shared/libs/week-range';
import type { SourceGate } from './view-cache-pages';
import {
  projectTasksPage,
  projectWeekTasks,
  startProjection,
  type PagedViewSpec,
  type ProjectionContext,
  type ProjectProgressMap,
} from './view-cache';

const PRODUCTIVITY = MODULE_IDS.productivity;

const NO_COUNTS = { done: 0, total: 0, closed: 0 };

const NO_PAGE = { rows: [], hasMore: false };

export function projectProgress(
  projects: Observable<readonly { id: string }[]>
): Observable<ProjectProgressMap> {
  return projects.pipe(
    switchMap((rows) =>
      rows.length === 0
        ? of(new Map())
        : combineLatest(
            rows.map((project) =>
              projectTaskService
                .observeProgress(project.id)
                .pipe(map((progress) => [project.id, progress] as const))
            )
          ).pipe(map((pairs) => new Map(pairs)))
    )
  );
}

export function startWeekTasks(gate: SourceGate, ctx: ProjectionContext): Subscription {
  const week = weekOf(ctx.now);
  const range = { from: week.from.getTime(), to: week.to.getTime() };
  return startProjection(
    {
      sources: () => ({
        counts: gate.of(PRODUCTIVITY, projectTaskService.observeDueCounts(range), {
          open: 0,
          done: 0,
          total: 0,
        }),
      }),
      project: projectWeekTasks,
    },
    ctx
  );
}

export function projectTaskPages(gate: SourceGate): PagedViewSpec<KeysetWindow> {
  return {
    key: VIEW_CACHE_KEYS.projectTasks,
    initial: () => ({ through: null }),
    open: (scope, window, context) =>
      startProjection(
        {
          sources: () => ({
            open: gate.of(PRODUCTIVITY, projectTaskService.observeOpenForProject(scope), []),
            done: gate.of(PRODUCTIVITY, projectTaskService.observeDonePage(scope, window), NO_PAGE),
            counts: gate.of(PRODUCTIVITY, projectTaskService.observeProgress(scope), NO_COUNTS),
          }),
          project: (values) => projectTasksPage(values, scope),
        },
        context
      ),
    extend: (scope, window) => projectTaskService.nextDoneWindow(scope, window),
    same: sameKeyset,
  };
}
