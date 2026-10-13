import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ProjectMemberModel } from '@/core/database';
import type { IServiceResponse } from '@/core/interfaces';
import type { ShareAccess } from '@/core/types';
import { DatabaseService } from './database.service';
import { httpService } from '@/core/services/http';

class ProjectMemberService extends DatabaseService<'project_member'> {
  constructor() {
    super('project_member');
  }

  observeAll(): Observable<ProjectMemberModel[]> {
    return this.observeManyWithColumns(['project_id', 'user_id', 'access'], [Q.sortBy('created_at', Q.asc)]);
  }

  add(projectId: string, userId: string, access: ShareAccess): Promise<IServiceResponse<unknown>> {
    return httpService.post('/project-member', { projectId: Number(projectId), userId: Number(userId), access });
  }

  setAccess(id: string, access: ShareAccess): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/project-member/${id}`, { access });
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/project-member/${id}`);
  }
}

export const projectMemberService = new ProjectMemberService();
