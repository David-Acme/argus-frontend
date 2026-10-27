import { useState } from 'react';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  newTaskDraft,
  taskDirty,
  taskDraftOf,
  taskProblems,
} from '@/features/projects/model/task-draft';
import type { NewTaskInput, TaskDraft, TaskProblem } from '@/features/projects/model/task-draft';
import { removeTask, saveTask } from '@/features/projects/services/project-commands';

export type TaskForm = {
  open: boolean;
  draft: TaskDraft;
  editing: IProjectTaskCacheRow | null;
  problems: readonly TaskProblem[];
  dirty: string | boolean;
  change: (patch: Partial<TaskDraft>) => void;
  startNew: (input: NewTaskInput) => void;
  startEdit: (task: IProjectTaskCacheRow) => void;
  close: () => void;
  submit: () => Promise<unknown> | undefined;
  remove: () => void;
};

const BLANK = newTaskDraft({ project: '', lane: 'todo' });

export function useTaskForm(): TaskForm {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IProjectTaskCacheRow | null>(null);
  const [start, setStart] = useState<TaskDraft>(BLANK);
  const [draft, setDraft] = useState<TaskDraft>(BLANK);
  const [tried, setTried] = useState(false);
  const problems = taskProblems(draft);

  const begin = (next: TaskDraft, task: IProjectTaskCacheRow | null) => {
    setStart(next);
    setDraft(next);
    setEditing(task);
    setTried(false);
    setOpen(true);
  };

  const submit = () => {
    if (problems.length > 0) {
      setTried(true);
      return undefined;
    }
    setOpen(false);
    return saveTask({ draft, task: editing, t });
  };

  const remove = () => {
    if (!editing) return;
    setOpen(false);
    void removeTask({ task: editing, t });
  };

  return {
    open,
    draft,
    editing,
    problems: tried ? problems : [],
    dirty: open ? taskDirty(draft, start) : false,
    change: (patch) => setDraft((current) => ({ ...current, ...patch })),
    startNew: (input) => begin(newTaskDraft(input), null),
    startEdit: (task) => begin(taskDraftOf(task), task),
    close: () => setOpen(false),
    submit,
    remove,
  };
}
