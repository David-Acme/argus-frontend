import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ProjectMemberModel } from '@/core/database';
import type {
  IProjectMemberCreate,
  IServiceResponse,
  IShareAccessUpdate,
} from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService } from '@/core/services/http';

class ProjectMemberService extends DatabaseService<'project_member'> {
  constructor() {
    super('project_member');
  }

  observeForProject(projectId: string): Observable<ProjectMemberModel[]> {
    return this.observeManyWithColumns(
      ['user_id', 'access'],
      [Q.where('project_id', projectId), Q.sortBy('created_at', Q.asc)],
    );
  }

  observeForUser(userId: string): Observable<ProjectMemberModel[]> {
    return this.observeManyWithColumns(
      ['project_id', 'access'],
      [Q.where('user_id', userId)],
    );
  }

  share(body: IProjectMemberCreate): Promise<IServiceResponse<unknown>> {
    return httpService.post('/project-member', body);
  }

  setAccess(id: string, body: IShareAccessUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/project-member/${id}`, body);
  }

  revoke(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/project-member/${id}`);
  }
}

export const projectMemberService = new ProjectMemberService();
