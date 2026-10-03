import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ProjectModel } from '@/core/database';
import type { IProjectCreate, IProjectUpdate, IServiceResponse } from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService, idempotentConfig } from '@/core/services/http';

class ProjectService extends DatabaseService<'project'> {
  constructor() {
    super('project');
  }

  observeList(): Observable<ProjectModel[]> {
    return this.observeManyWithColumns(
      ['name', 'description', 'status', 'color', 'target_at'],
      [Q.sortBy('created_at', Q.desc)],
    );
  }

  observeActive(): Observable<ProjectModel[]> {
    return this.observeManyWithColumns(
      ['name', 'status', 'color', 'target_at'],
      [Q.where('status', Q.oneOf(['planned', 'active'])), Q.sortBy('created_at', Q.desc)],
    );
  }

  create(body: IProjectCreate, idempotencyKey?: string): Promise<IServiceResponse<unknown>> {
    return httpService.post('/project', body, idempotentConfig(idempotencyKey));
  }

  update(id: string, body: IProjectUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/project/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/project/${id}`);
  }
}

export const projectService = new ProjectService();
