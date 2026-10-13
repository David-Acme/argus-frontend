import type { IPeopleDirectoryCacheRow, IProjectMemberCacheRow } from '@/core/interfaces';
import type { ShareAccess } from '@/core/types';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';
import { personFullName } from '@/shared/libs/sharing';

export type ProjectMemberIntentValues = {
  projectId: number;
  userId: number;
  access: ShareAccess;
};

export function projectMemberLens(
  projectId: string,
  people: readonly IPeopleDirectoryCacheRow[]
): OptimisticLens<IProjectMemberCacheRow> {
  return defineLens<IProjectMemberCacheRow, ProjectMemberIntentValues>({
    table: 'project_member',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({ ...row, access: values.access ?? row.access }),
    create: (recordId, values) => {
      if (values.userId === undefined || String(values.projectId) !== projectId) return null;
      const userId = String(values.userId);
      const person = people.find((candidate) => candidate.id === userId);
      return {
        id: recordId,
        projectId,
        userId,
        name: person ? personFullName(person) : '',
        access: values.access ?? 'view',
      };
    },
  });
}
