import { Q } from '@nozbe/watermelondb';
import { combineLatest, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ProjectTaskModel } from '@/core/database';
import type {
  IProjectTaskCreate,
  IProjectTaskUpdate,
  IServiceResponse,
} from '@/core/interfaces';
import type { KeysetPage, KeysetWindow } from '@/core/types';
import { DatabaseService, type KeysetQuery } from './database.service';
import { wordClauses, type PageSegment } from './paging';
import { PROJECT_DONE_PAGE_SIZE, SEARCH_PAGE_SIZE, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants';
import type { TaskProgress } from '@/shared/libs/task-progress';
import { httpService, idempotentConfig } from '@/core/services/http';

const CLOSED_TASK_STATUSES = ['done', 'canceled'];

const TASK_COLUMNS = ['title', 'status', 'priority', 'due_at', 'created_via', 'updated_at'];

export type TaskCounts = { open: number; done: number; total: number };

export type DueRange = { from: number; to: number };

class ProjectTaskService extends DatabaseService<'project_task'> {
  constructor() {
    super('project_task');
  }

  searchOpen(words: readonly string[], dated: boolean): PageSegment<ProjectTaskModel> {
    return this.keysetSegment({
      clauses: [
        Q.where('status', Q.notIn(CLOSED_TASK_STATUSES)),
        Q.where('due_at', dated ? Q.notEq(null) : Q.eq(null)),
        ...wordClauses(['title'], words),
      ],
      sort: dated ? { column: 'due_at', order: 'asc' } : { column: 'created_at', order: 'desc' },
      columns: ['title', 'status', 'due_at', 'project_id'],
      pageSize: SEARCH_PAGE_SIZE,
    });
  }

  observeOpenForProject(projectId: string): Observable<ProjectTaskModel[]> {
    return this.observeManyWithColumns(TASK_COLUMNS, [
      Q.where('project_id', projectId),
      Q.where('status', Q.notIn(CLOSED_TASK_STATUSES)),
      Q.sortBy('created_at', Q.asc),
      Q.take(VIEW_CACHE_LIST_LIMIT),
    ]);
  }

  observeDonePage(projectId: string, window: KeysetWindow): Observable<KeysetPage<ProjectTaskModel>> {
    return this.observeKeysetPage(this.doneQuery(projectId), window);
  }

  nextDoneWindow(projectId: string, window: KeysetWindow): Promise<KeysetWindow> {
    return this.nextKeysetWindow(this.doneQuery(projectId), window);
  }

  observeProgress(projectId: string): Observable<TaskProgress & { closed: number }> {
    const inProject = Q.where('project_id', projectId);
    return combineLatest([
      this.observeTotal([inProject, Q.where('status', 'done')]),
      this.observeTotal([inProject, Q.where('status', Q.notEq('canceled'))]),
      this.observeTotal([inProject, Q.where('status', Q.oneOf(CLOSED_TASK_STATUSES))]),
    ]).pipe(map(([done, total, closed]) => ({ done, total, closed })));
  }

  observeOpenCount(): Observable<number> {
    return this.observeTotal([Q.where('status', Q.notIn(CLOSED_TASK_STATUSES))]);
  }

  observeDueCounts({ from, to }: DueRange): Observable<TaskCounts> {
    const due = [Q.where('due_at', Q.gte(from)), Q.where('due_at', Q.lte(to))];
    return combineLatest([
      this.observeTotal([...due, Q.where('status', Q.notIn(CLOSED_TASK_STATUSES))]),
      this.observeTotal([...due, Q.where('status', 'done')]),
      this.observeTotal(due),
    ]).pipe(map(([open, done, total]) => ({ open, done, total })));
  }

  private doneQuery(projectId: string): KeysetQuery {
    return {
      clauses: [Q.where('project_id', projectId), Q.where('status', Q.oneOf(CLOSED_TASK_STATUSES))],
      sort: { column: 'updated_at', order: 'desc' },
      columns: TASK_COLUMNS,
      pageSize: PROJECT_DONE_PAGE_SIZE,
    };
  }

  observeByProject(projectId: string): Observable<ProjectTaskModel[]> {
    return this.observeManyWithColumns(
      ['title', 'status', 'priority', 'due_at', 'sort_order', 'assignee_id'],
      [Q.where('project_id', projectId), Q.sortBy('sort_order', Q.asc)],
    );
  }

  observeOpenForAssignee(assigneeId: string): Observable<ProjectTaskModel[]> {
    return this.observeManyWithColumns(
      ['title', 'status', 'priority', 'due_at'],
      [
        Q.where('assignee_id', assigneeId),
        Q.where('status', Q.oneOf(['backlog', 'todo', 'doing'])),
        Q.sortBy('due_at', Q.asc),
      ],
    );
  }

  observeDueRange(fromMs: number, toMs: number): Observable<ProjectTaskModel[]> {
    return this.observeManyWithColumns(
      ['title', 'status', 'priority', 'due_at', 'project_id'],
      [
        Q.where('due_at', Q.gte(fromMs)),
        Q.where('due_at', Q.lte(toMs)),
        Q.sortBy('due_at', Q.asc),
      ],
    );
  }

  create(body: IProjectTaskCreate, idempotencyKey?: string): Promise<IServiceResponse<unknown>> {
    return httpService.post('/project-task', body, idempotentConfig(idempotencyKey));
  }

  update(id: string, body: IProjectTaskUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/project-task/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/project-task/${id}`);
  }
}

export const projectTaskService = new ProjectTaskService();
