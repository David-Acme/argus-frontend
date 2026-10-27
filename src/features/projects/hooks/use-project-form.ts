import { useState } from 'react';
import type { IProjectCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  NEW_PROJECT,
  projectDirty,
  projectDraftOf,
  projectProblems,
} from '@/features/projects/model/project-draft';
import type { ProjectDraft, ProjectProblem } from '@/features/projects/model/project-draft';
import { removeProject, saveProject } from '@/features/projects/services/project-commands';

export type ProjectForm = {
  open: boolean;
  draft: ProjectDraft;
  editing: IProjectCacheRow | null;
  problems: readonly ProjectProblem[];
  dirty: string | boolean;
  change: (patch: Partial<ProjectDraft>) => void;
  startNew: () => void;
  startEdit: (project: IProjectCacheRow) => void;
  close: () => void;
  submit: () => Promise<unknown> | undefined;
  remove: () => void;
};

export function useProjectForm(): ProjectForm {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IProjectCacheRow | null>(null);
  const [start, setStart] = useState<ProjectDraft>(NEW_PROJECT);
  const [draft, setDraft] = useState<ProjectDraft>(NEW_PROJECT);
  const [tried, setTried] = useState(false);
  const problems = projectProblems(draft);

  const begin = (next: ProjectDraft, project: IProjectCacheRow | null) => {
    setStart(next);
    setDraft(next);
    setEditing(project);
    setTried(false);
    setOpen(true);
  };

  const submit = () => {
    if (problems.length > 0) {
      setTried(true);
      return undefined;
    }
    setOpen(false);
    return saveProject({ draft, project: editing, t });
  };

  const remove = () => {
    if (!editing) return;
    setOpen(false);
    void removeProject({ project: editing, t });
  };

  return {
    open,
    draft,
    editing,
    problems: tried ? problems : [],
    dirty: open ? projectDirty(draft, start) : false,
    change: (patch) => setDraft((current) => ({ ...current, ...patch })),
    startNew: () => begin(NEW_PROJECT, null),
    startEdit: (project) => begin(projectDraftOf(project), project),
    close: () => setOpen(false),
    submit,
    remove,
  };
}
