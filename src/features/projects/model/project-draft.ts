import type { IProjectCacheRow, IProjectCreate } from '@/core/interfaces';
import type { ProjectStatus } from '@/core/types';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
} from '@/features/projects/constants/projects.constant';

export type ProjectDraft = { name: string; description: string; status: ProjectStatus };

export type ProjectProblem = 'name' | 'name-long' | 'description-long';

export const NEW_PROJECT: ProjectDraft = { name: '', description: '', status: 'active' };

export const projectDraftOf = (project: IProjectCacheRow): ProjectDraft => ({
  name: project.name,
  description: project.description,
  status: project.status as ProjectStatus,
});

export function projectProblems(draft: ProjectDraft): ProjectProblem[] {
  const name = draft.name.trim();
  const problems: ProjectProblem[] = [];
  if (name === '') problems.push('name');
  else if (name.length > PROJECT_NAME_MAX) problems.push('name-long');
  if (draft.description.trim().length > PROJECT_DESCRIPTION_MAX) problems.push('description-long');
  return problems;
}

export function projectDirty(draft: ProjectDraft, start: ProjectDraft): string | boolean {
  const changed =
    draft.name !== start.name ||
    draft.description !== start.description ||
    draft.status !== start.status;
  if (!changed) return false;
  return draft.name.trim() || true;
}

export const projectBody = (draft: ProjectDraft): IProjectCreate => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  status: draft.status,
});
