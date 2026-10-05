import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ProjectTaskModel } from '@/core/database';
import type {
  IProjectTaskCreate,
  IProjectTaskUpdate,
  IServiceResponse,
} from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService, idempotentConfig } from '@/core/services/http';

class ProjectTaskService extends DatabaseService<'project_task'> {
  constructor() {
    super('project_task');
  }

  observeAll(): Observable<ProjectTaskModel[]> {
    return this.observeManyWithColumns(
      ['title', 'status', 'priority', 'project_id', 'due_at', 'sort_order'],
      [Q.sortBy('sort_order', Q.asc)],
    );
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

  observeAnyDueAfter(afterMs: number): Observable<boolean> {
    return this.observeMany([Q.where('due_at', Q.gt(afterMs)), Q.take(1)]).pipe(
      map((rows) => rows.length > 0),
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
