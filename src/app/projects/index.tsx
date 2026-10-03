import { useAuthStore } from '@/core/stores';
import { projectTaskService } from '@/core/services/project-task.service';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { MenuOption, ProjectStatus, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { DashboardIconButton, DashboardShell } from '@/shared/components/dashboard';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { EmptyState } from '@/shared/components/ui/empty-state';
import {
  CreateAffordance,
  ProjectBoardHeader,
  ProjectCardRow,
  ProjectForm,
  ProjectSwitcher,
  TaskBoard,
  TaskForm,
  TaskLane,
  TaskRow,
} from '@/shared/components/projects';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { TASK_PRIORITY_WEIGHT, TASK_STATUS_ORDER } from '@/shared/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useProjectsData } from '@/shared/hooks/use-projects-data';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { screenIn } from '@/shared/libs/animations';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

type TaskLaneKey = 'open' | 'doing' | 'finished';

type TaskLaneModel = {
  key: TaskLaneKey;
  label: string;
  toneClassName: string;
  statuses: readonly ProjectTaskStatus[];
  createStatus: ProjectTaskStatus;
  tasks: IProjectTaskCacheRow[];
};

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
  const [newTaskStatus, setNewTaskStatus] = useState<ProjectTaskStatus>('todo');
  const { isExpanded } = useWindowClass();
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

  const projectStatusLabels = useMemo<Record<ProjectStatus, string>>(
    () => ({
      planned: t('screens.projects.project-status-planned'),
      active: t('screens.projects.project-status-active'),
      paused: t('screens.projects.project-status-paused'),
      done: t('screens.projects.project-status-done'),
      canceled: t('screens.projects.project-status-canceled'),
    }),
    [t]
  );

  const lanes = useMemo<TaskLaneModel[]>(() => {
    const models: TaskLaneModel[] = [
      {
        key: 'open',
        label: t('screens.projects.lane-open'),
        toneClassName: 'bg-muted-foreground',
        statuses: ['todo', 'backlog'],
        createStatus: 'todo',
        tasks: [],
      },
      {
        key: 'doing',
        label: t('screens.projects.lane-doing'),
        toneClassName: 'bg-accent',
        statuses: ['doing'],
        createStatus: 'doing',
        tasks: [],
      },
      {
        key: 'finished',
        label: t('screens.projects.lane-finished'),
        toneClassName: 'bg-success',
        statuses: ['done', 'canceled'],
        createStatus: 'done',
        tasks: [],
      },
    ];
    for (const task of displayTasks) {
      const lane = models.find((model) => model.statuses.includes(task.status as ProjectTaskStatus));
      if (lane) lane.tasks.push(task);
    }
    const statusRank = (status: string) => TASK_STATUS_ORDER.indexOf(status as ProjectTaskStatus);
    for (const lane of models) {
      lane.tasks.sort(
        (left, right) =>
          statusRank(left.status) - statusRank(right.status) ||
          (TASK_PRIORITY_WEIGHT[left.priority] ?? 9) - (TASK_PRIORITY_WEIGHT[right.priority] ?? 9)
      );
    }
    return models;
  }, [displayTasks, t]);

  const activeProject = displayProjects.find((project) => project.id === activeId);
  const canCreateTask = can('project_task', 'create') && activeId.length > 0;
  const canCreateProject = can('project', 'create');
  const countLabel = t('screens.projects.task-count', {
    done: String(progress.done),
    total: String(progress.total),
  });
  const ratio = progress.total > 0 ? progress.done / progress.total : 0;

  const formatDue = useCallback(
    (due: number | null) => (due == null ? undefined : date.formatDayMonth(new Date(due))),
    [date]
  );

  const changeStatus = useCallback((taskId: string, status: ProjectTaskStatus) => {
    void projectTaskService.update(taskId, { status });
  }, []);

  const openNewTask = useCallback((status: ProjectTaskStatus) => {
    setEditingTaskId('');
    setNewTaskStatus(status);
    setTaskFormOpen(true);
  }, []);

  if (authStatus !== 'signed-in') return <Redirect href="/" />;

  return (
    <DashboardShell
      active="projects"
      aside={
        isExpanded && displayProjects.length > 0 ? (
          <View className="gap-3">
            <SectionHeader title={t('screens.projects.all-projects')} />
            {displayProjects.map((project) => {
              const active = project.id === activeId;
              const status = project.status as ProjectStatus;
              return (
                <ProjectCardRow
                  key={project.id}
                  name={project.name}
                  description={project.description}
                  status={status}
                  statusLabel={projectStatusLabels[status] ?? project.status}
                  taskCount={active ? countLabel : (projectStatusLabels[status] ?? '')}
                  progress={active ? ratio : 0}
                  selected={active}
                  onPress={() => setSelectedId(project.id)}
                />
              );
            })}
            {canCreateProject ? (
              <CreateAffordance
                label={t('screens.projects.new-project')}
                onPress={() => setProjectFormOpen(true)}
              />
            ) : null}
          </View>
        ) : undefined
      }>
      <Animated.View entering={screenIn} className="flex-1 gap-5">
        <View className="flex-row items-center justify-between">
          <DashboardIconButton
            icon="arrow-left"
            label={t('common.back')}
            onPress={() => router.replace('/')}
          />
          <Text variant="title">{t('screens.projects.title')}</Text>
          {canCreateProject ? (
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
              canCreateProject ? (
                <Button onPress={() => setProjectFormOpen(true)}>
                  <Text>{t('screens.projects.new-project')}</Text>
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {isExpanded ? null : (
              <ProjectSwitcher
                projects={displayProjects.map((project) => ({
                  id: project.id,
                  name: project.name,
                  status: project.status as ProjectStatus,
                }))}
                activeId={activeId}
                onSelect={setSelectedId}
              />
            )}

            <ProjectBoardHeader
              name={activeProject?.name ?? ''}
              description={activeProject?.description ?? ''}
              status={(activeProject?.status ?? 'active') as ProjectStatus}
              statusLabel={
                projectStatusLabels[(activeProject?.status ?? 'active') as ProjectStatus] ?? ''
              }
              countLabel={countLabel}
              percentLabel={t('screens.projects.progress-percent', {
                percent: String(Math.round(ratio * 100)),
              })}
              progress={ratio}
              editLabel={t('common.edit')}
              newTaskLabel={t('screens.projects.new-task')}
              onEdit={
                can('project', 'update') && activeId
                  ? () => {
                      setEditingProject(true);
                      setProjectFormOpen(true);
                    }
                  : undefined
              }
              onNewTask={canCreateTask ? () => openNewTask('todo') : undefined}
            />

            <TaskBoard>
              {lanes.map((lane) => (
                <TaskLane
                  key={lane.key}
                  label={lane.label}
                  count={lane.tasks.length}
                  toneClassName={lane.toneClassName}
                  emptyLabel={t('screens.projects.lane-empty')}
                  addLabel={t('screens.projects.add-task')}
                  onAdd={canCreateTask ? () => openNewTask(lane.createStatus) : undefined}>
                  {lane.tasks.map((task) => {
                    const status = task.status as ProjectTaskStatus;
                    return (
                      <TaskRow
                        key={task.id}
                        title={task.title}
                        status={status}
                        priority={task.priority as ProjectTaskPriority}
                        priorityLabel={priorityLabels[task.priority as ProjectTaskPriority]}
                        due={formatDue(task.dueAt)}
                        statusTag={
                          status === 'backlog' || status === 'canceled' ? statusLabels[status] : undefined
                        }
                        statusOptions={statusOptions}
                        statusMenuTitle={t('screens.projects.select-status')}
                        closeLabel={t('screens.projects.close')}
                        onChangeStatus={(next) => changeStatus(task.id, next)}
                        onPress={() => {
                          setEditingTaskId(task.id);
                          setTaskFormOpen(true);
                        }}
                      />
                    );
                  })}
                </TaskLane>
              ))}
            </TaskBoard>
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
          defaultStatus={newTaskStatus}
        />
      ) : null}
    </DashboardShell>
  );
}
