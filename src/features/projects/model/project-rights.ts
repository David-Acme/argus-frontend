import type { TableName } from '@/core/types';
import type { Permission } from '@/shared/libs/role-access';
import { ownsProject, worksOnProject } from '@/features/projects/model/project-access';
import type { ProjectAccess } from '@/features/projects/model/project-access';

export type ProjectRightsInput = {
  access: ProjectAccess;
  can: (table: TableName, permission: Permission) => boolean;
  pending: boolean;
  directory: boolean;
};

export type ProjectRights = {
  createTask: boolean;
  editTask: boolean;
  editProject: boolean;
  removeProject: boolean;
  members: boolean;
  viewOnly: boolean;
};

export type ProjectMenuKey = 'members' | 'edit' | 'ask';

export type ProjectMenuInput = { rights: ProjectRights; ask: boolean };

export function projectRights({
  access,
  can,
  pending,
  directory,
}: ProjectRightsInput): ProjectRights {
  const works = worksOnProject(access) && !pending;
  const owns = ownsProject(access) && !pending;
  return {
    createTask: works && can('project_task', 'create'),
    editTask: works && can('project_task', 'update'),
    editProject: works && can('project', 'update'),
    removeProject: owns && can('project', 'delete'),
    members: owns && directory,
    viewOnly: access === 'view',
  };
}

export function projectMenu({ rights, ask }: ProjectMenuInput): ProjectMenuKey[] {
  return [
    ...(rights.members ? (['members'] as const) : []),
    ...(rights.editProject ? (['edit'] as const) : []),
    ...(ask ? (['ask'] as const) : []),
  ];
}
