import { useMemo } from 'react';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { ModelOf } from '@/core/types';
import { useObservable } from './use-observable';

type ProjectsData = {
  projects: ModelOf<'project'>[];
  tasks: ModelOf<'project_task'>[];
  /**
   * The selection actually in effect: the caller's choice, or the first project
   * while nothing is chosen. Derived rather than stored, so the screen never
   * writes state from an effect just to pick a default.
   */
  activeId: string;
  progress: { done: number; total: number };
};

export function useProjectsData(selectedId: string): ProjectsData {
  const projects = useObservable(() => projectService.observeList(), [], []);
  const activeId = selectedId.length > 0 ? selectedId : (projects[0]?.id ?? '');
  const tasks = useObservable(
    () => projectTaskService.observeByProject(activeId),
    [],
    [activeId],
  );

  const progress = useMemo(
    () => ({ done: tasks.filter((task) => task.status === 'done').length, total: tasks.length }),
    [tasks],
  );

  return { projects, tasks, activeId, progress };
}
