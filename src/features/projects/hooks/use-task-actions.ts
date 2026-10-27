import { useRef } from 'react';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { ProjectTaskStatus } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback } from '@/shared/theme';
import { toggledStatus } from '@/features/projects/model/task-lanes';
import { removeTask, setTaskStatus } from '@/features/projects/services/project-commands';

export type TaskActions = {
  setStatus: (task: IProjectTaskCacheRow, status: ProjectTaskStatus) => void;
  toggle: (task: IProjectTaskCacheRow) => void;
  remove: (task: IProjectTaskCacheRow) => void;
};

export function useTaskActions(): TaskActions {
  const { t } = useTranslation();
  const flying = useRef(new Set<string>());

  const single = (task: IProjectTaskCacheRow, action: () => Promise<unknown>) => {
    if (flying.current.has(task.id)) return;
    flying.current.add(task.id);
    void action()
      .catch(() => undefined)
      .finally(() => flying.current.delete(task.id));
  };

  const setStatus = (task: IProjectTaskCacheRow, status: ProjectTaskStatus) => {
    if (status === task.status) return;
    if (status === 'done') feedback('success');
    single(task, () => setTaskStatus({ task, status, t }));
  };

  return {
    setStatus,
    toggle: (task) => setStatus(task, toggledStatus(task.status as ProjectTaskStatus)),
    remove: (task) => single(task, () => removeTask({ task, t })),
  };
}
