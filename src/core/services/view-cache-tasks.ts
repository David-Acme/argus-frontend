import { combineLatest, of, type Observable, type Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import type { SourceGate } from '@/core/services/paging';
import { projectTaskService } from '@/core/services/project-task.service';
import { MODULE_IDS } from '@/shared/constants';
import { weekOf } from '@/shared/libs/week-range';

import {
  projectWeekTasks,
  startProjection,
  type ProjectionContext,
  type ProjectProgressMap,
} from './view-cache';

const PRODUCTIVITY = MODULE_IDS.productivity;

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
