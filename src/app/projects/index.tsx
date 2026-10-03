import { useAuthStore } from '@/core/stores';
import { projectTaskService } from '@/core/services/project-task.service';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { MenuOption, ProjectStatus, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { DashboardIconButton, DashboardShell, SectionHeading } from '@/shared/components/dashboard';
import { EmptyState } from '@/shared/components/layout';
import {
  ProjectCardRow,
  ProjectForm,
  TaskForm,
  TaskRow,
  TaskStatusGroup,
} from '@/shared/components/projects';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { TASK_PRIORITY_WEIGHT, TASK_STATUS_ORDER } from '@/shared/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useProjectsData } from '@/shared/hooks/use-projects-data';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { screenIn } from '@/shared/libs/animations';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function ProjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const authStatus = useAuthStore((state) => state.status);
  const {
    new: newParam,
    id: idParam,
    task: taskParam,
  } = useLocalSearchParams<{ new?: string; id?: string; task?: string }>();
  const [selectedId, setSelectedId] = useState(idParam ?? '');
  const [projectFormOpen, setProjectFormOpen] = useState(newParam === 'project');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const { projects, tasks, displayProjects, displayTasks, activeId, progress } = useProjectsData(selectedId);
  const { can } = usePermissions();
  const [pendingTaskId, setPendingTaskId] = useState(taskParam ?? '');

  if (pendingTaskId && tasks.some((item) => item.id === pendingTaskId)) {
    setPendingTaskId('');
    setEditingTaskId(pendingTaskId);
    setTaskFormOpen(true);
  }

  const statusOptions = useMemo<MenuOption<ProjectTaskStatus>[]>(
    () => [
      { value: 'backlog', label: t('screens.projects.status-backlog') },
      { value: 'todo', label: t('screens.projects.status-todo') },
      { value: 'doing', label: t('screens.projects.status-doing') },
      { value: 'done', label: t('screens.projects.status-done') },
      { value: 'canceled', label: t('screens.projects.status-canceled') },
    ],
    [t]
  );
  const statusLabels = useMemo<Record<ProjectTaskStatus, string>>(
    () => ({
      backlog: t('screens.projects.status-backlog'),
      todo: t('screens.projects.status-todo'),
      doing: t('screens.projects.status-doing'),
      done: t('screens.projects.status-done'),
      canceled: t('screens.projects.status-canceled'),
    }),
    [t]
  );
  const priorityLabels = useMemo<Record<ProjectTaskPriority, string>>(
    () => ({
      none: t('screens.projects.priority-none'),
      low: t('screens.projects.priority-low'),
      medium: t('screens.projects.priority-medium'),
      high: t('screens.projects.priority-high'),
      urgent: t('screens.projects.priority-urgent'),
    }),
    [t]
  );

  const grouped = useMemo(() => {
    const map = new Map<ProjectTaskStatus, IProjectTaskCacheRow[]>();
    for (const status of TASK_STATUS_ORDER) map.set(status, []);
    for (const task of displayTasks) {
      const bucket = map.get(task.status as ProjectTaskStatus);
      if (bucket) bucket.push(task);
    }
    for (const bucket of map.values()) {
      bucket.sort(
        (left, right) =>
          (TASK_PRIORITY_WEIGHT[left.priority] ?? 9) - (TASK_PRIORITY_WEIGHT[right.priority] ?? 9)
      );
    }
    return map;
  }, [displayTasks]);

  const formatDue = useCallback(
    (due: number | null) => (due == null ? undefined : date.formatDayMonth(new Date(due))),
    [date]
  );

  const changeStatus = useCallback((taskId: string, status: ProjectTaskStatus) => {
    void projectTaskService.update(taskId, { status });
  }, []);

  if (authStatus !== 'signed-in') return <Redirect href="/" />;

  return (
    <DashboardShell
      active="projects"
      aside={
        displayProjects.length === 0 ? undefined : (
          <View className="gap-3">
            <SectionHeading title={t('screens.projects.title')} />
            {displayProjects.map((project) => {
              const active = project.id === activeId;
              return (
                <ProjectCardRow
                  key={project.id}
                  name={project.name}
                  description={project.description}
                  status={project.status as ProjectStatus}
                  statusLabel={project.status}
                  taskCount={
                    active
                      ? t('screens.projects.task-count', {
                          done: String(progress.done),
                          total: String(progress.total),
                        })
                      : ''
                  }
                  progress={active && progress.total > 0 ? progress.done / progress.total : 0}
                  selected={active}
                  onPress={() => setSelectedId(project.id)}
                />
              );
            })}
          </View>
        )
      }>
      <Animated.View entering={screenIn} className="flex-1 gap-5">
        <View className="flex-row items-center justify-between">
          <DashboardIconButton
            icon="arrow-left"
            label={t('common.back')}
            onPress={() => router.replace('/')}
          />
          <Text variant="title">
            {t('screens.projects.title')}
          </Text>
          {can('project', 'create') ? (
            <DashboardIconButton
              icon="plus"
              label={t('screens.projects.new-project')}
              onPress={() => setProjectFormOpen(true)}
            />
          ) : (
            <View className="size-11" />
          )}
        </View>

        {displayProjects.length === 0 ? (
          <EmptyState
            icon="list-todo"
            title={t('screens.projects.empty')}
            hint={t('screens.projects.empty-hint')}
            action={
              can('project', 'create') ? (
                <Button onPress={() => setProjectFormOpen(true)}>
                  <Text>{t('screens.projects.new-project')}</Text>
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-subhead font-semibold" numberOfLines={1}>
                {displayProjects.find((project) => project.id === activeId)?.name ?? ''}
              </Text>
              <Text className="text-muted-foreground text-xs font-medium">
                {t('screens.projects.task-count', {
                  done: String(progress.done),
                  total: String(progress.total),
                })}
              </Text>
              {can('project', 'update') && activeId ? (
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={t('common.edit')}
                  onPress={() => {
                    setEditingProject(true);
                    setProjectFormOpen(true);
                  }}>
                  <Icon name="square-pen" className="text-muted-foreground size-4" />
                </Button>
              ) : null}
              {can('project_task', 'create') && activeId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setEditingTaskId('');
                    setTaskFormOpen(true);
                  }}>
                  <Text>{t('screens.projects.new-task')}</Text>
                </Button>
              ) : null}
            </View>

            {displayTasks.length === 0 ? (
              <EmptyState icon="list-todo" title={t('screens.projects.empty-tasks')} />
            ) : (
              <View className="flex-1 gap-4">
                {TASK_STATUS_ORDER.map((status) => {
                  const bucket = grouped.get(status) ?? [];
                  return (
                    <TaskStatusGroup
                      key={status}
                      label={statusLabels[status]}
                      count={bucket.length}>
                      {bucket.map((task) => (
                        <TaskRow
                          key={task.id}
                          title={task.title}
                          status={task.status as ProjectTaskStatus}
                          priority={task.priority as ProjectTaskPriority}
                          priorityLabel={priorityLabels[task.priority as ProjectTaskPriority]}
                          due={formatDue(task.dueAt)}
                          statusOptions={statusOptions}
                          statusMenuTitle={t('screens.projects.select-status')}
                          closeLabel={t('screens.projects.close')}
                          onChangeStatus={(next) => changeStatus(task.id, next)}
                          onPress={() => {
                            setEditingTaskId(task.id);
                            setTaskFormOpen(true);
                          }}
                        />
                      ))}
                    </TaskStatusGroup>
                  );
                })}
              </View>
            )}
          </>
        )}
      </Animated.View>

      <ProjectForm
        open={projectFormOpen}
        onOpenChange={(open) => {
          setProjectFormOpen(open);
          if (!open) setEditingProject(false);
        }}
        project={editingProject ? (projects.find((item) => item.id === activeId) ?? null) : null}
      />
      {activeId ? (
        <TaskForm
          open={taskFormOpen}
          onOpenChange={(open) => {
            setTaskFormOpen(open);
            if (!open) setEditingTaskId('');
          }}
          projectId={activeId}
          task={tasks.find((item) => item.id === editingTaskId) ?? null}
        />
      ) : null}
    </DashboardShell>
  );
}
