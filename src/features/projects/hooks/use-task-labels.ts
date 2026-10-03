import { useMemo } from 'react';
import type { MenuOption, ProjectStatus, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { TaskLaneKey } from '@/features/projects/model/task-lanes';

type TaskLabels = {
  statusOptions: MenuOption<ProjectTaskStatus>[];
  priorityOptions: MenuOption<ProjectTaskPriority>[];
  projectStatusOptions: MenuOption<ProjectStatus>[];
  status: Record<ProjectTaskStatus, string>;
  priority: Record<ProjectTaskPriority, string>;
  projectStatus: Record<ProjectStatus, string>;
  lane: Record<TaskLaneKey, string>;
};

export function useTaskLabels(): TaskLabels {
  const { t } = useTranslation();

  return useMemo(() => {
    const status: Record<ProjectTaskStatus, string> = {
      backlog: t('screens.projects.status-backlog'),
      todo: t('screens.projects.status-todo'),
      doing: t('screens.projects.status-doing'),
      done: t('screens.projects.status-done'),
      canceled: t('screens.projects.status-canceled'),
    };
    const priority: Record<ProjectTaskPriority, string> = {
      none: t('screens.projects.priority-none'),
      low: t('screens.projects.priority-low'),
      medium: t('screens.projects.priority-medium'),
      high: t('screens.projects.priority-high'),
      urgent: t('screens.projects.priority-urgent'),
    };
    const projectStatus: Record<ProjectStatus, string> = {
      planned: t('screens.projects.project-status-planned'),
      active: t('screens.projects.project-status-active'),
      paused: t('screens.projects.project-status-paused'),
      done: t('screens.projects.project-status-done'),
      canceled: t('screens.projects.project-status-canceled'),
    };
    const options = <K extends string>(labels: Record<K, string>): MenuOption<K>[] =>
      (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
    return {
      statusOptions: options(status),
      priorityOptions: options(priority),
      projectStatusOptions: options(projectStatus),
      status,
      priority,
      projectStatus,
      lane: {
        open: t('screens.projects.lane-open'),
        doing: t('screens.projects.lane-doing'),
        finished: t('screens.projects.lane-finished'),
      },
    };
  }, [t]);
}
