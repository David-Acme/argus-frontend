import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { projectTaskService } from '@/core/services/project-task.service';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { ProjectStatus, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { AppScreen } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { SCREEN_TITLE_KEYS } from '@/shared/constants';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { screenIn } from '@/shared/libs/animations';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { ProjectAside } from '@/features/projects/components/project-aside';
import { ProjectBoardHeader } from '@/features/projects/components/project-board-header';
import { ProjectForm } from '@/features/projects/components/project-form';
import { ProjectSwitcher } from '@/features/projects/components/project-switcher';
import { TaskBoard } from '@/features/projects/components/task-board';
import { DraggableTask } from '@/features/projects/components/task-drag';
import { TaskForm } from '@/features/projects/components/task-form';
import { TaskLane } from '@/features/projects/components/task-lane';
import { TaskRow } from '@/features/projects/components/task-row';
import type { UpcomingTaskItem } from '@/features/projects/components/upcoming-tasks-panel';
import { useProjectsData } from '@/features/projects/hooks/use-projects-data';
import { useTaskLabels } from '@/features/projects/hooks/use-task-labels';
import {
  groupTasksByLane,
  statusForLane,
  TASK_LANES,
  type TaskLaneKey,
  upcomingTasks,
} from '@/features/projects/model/task-lanes';

type ProjectsParams = { id?: string; task?: string };

const UPCOMING_LIMIT = 6;

export default function ProjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { id: idParam, task: taskParam } = useLocalSearchParams<ProjectsParams>();
  const [selectedId, setSelectedId] = useState(idParam ?? '');
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<ProjectTaskStatus>('todo');
  const [pendingTaskId, setPendingTaskId] = useState(taskParam ?? '');
  const { isExpanded } = useWindowClass();
  const { can } = useCapabilities();
  const labels = useTaskLabels();
  const { projects, tasks, activeId, activePending, progress, isPendingTask } =
    useProjectsData(selectedId);
  const lanes = useMemo(() => groupTasksByLane(tasks), [tasks]);
  const today = date.startOfDay(new Date()).getTime();
  const upcoming = useMemo<UpcomingTaskItem[]>(
    () =>
      upcomingTasks(tasks, UPCOMING_LIMIT).map((task) => ({
        id: task.id,
        title: task.title,
        due: date.formatDayMonth(new Date(task.dueAt ?? 0)),
        overdue: (task.dueAt ?? 0) < today,
      })),
    [date, tasks, today]
  );
  const activeProject = projects.find((project) => project.id === activeId);
  const activeStatus = (activeProject?.status ?? 'active') as ProjectStatus;
  const canCreateProject = can('project', 'create');
  const canCreateTask = can('project_task', 'create') && activeId.length > 0 && !activePending;
  const canUpdateTask = can('project_task', 'update');
  const countLabel = t('screens.projects.task-count', {
    done: String(progress.done),
    total: String(progress.total),
  });
  const ratio = progress.total > 0 ? progress.done / progress.total : 0;

  if (pendingTaskId && tasks.some((item) => item.id === pendingTaskId)) {
    setPendingTaskId('');
    setEditingTaskId(pendingTaskId);
    setTaskFormOpen(true);
  }

  const openTask = useCallback((taskId: string) => {
    setEditingTaskId(taskId);
    setTaskFormOpen(true);
  }, []);

  const openNewTask = useCallback((status: ProjectTaskStatus) => {
    setEditingTaskId('');
    setNewTaskStatus(status);
    setTaskFormOpen(true);
  }, []);

  const openProjectForm = useCallback((editing: boolean) => {
    setEditingProject(editing);
    setProjectFormOpen(true);
  }, []);

  const changeStatus = useCallback((taskId: string, status: ProjectTaskStatus) => {
    void runOptimistic({
      intents: [{ table: 'project_task', kind: 'update', recordId: taskId, values: { status } }],
      call: () => projectTaskService.update(taskId, { status }),
    });
  }, []);

  const moveTask = useCallback(
    (taskId: string, laneIndex: number) => {
      const task = tasks.find((candidate) => candidate.id === taskId);
      const lane = TASK_LANES[laneIndex];
      if (!task || !lane) return;
      const next = statusForLane(lane.key, task.status as ProjectTaskStatus);
      if (next !== task.status) changeStatus(taskId, next);
    },
    [changeStatus, tasks]
  );

  const renderTask = useCallback(
    (task: IProjectTaskCacheRow, laneIndex: number) => {
      const status = task.status as ProjectTaskStatus;
      const priority = task.priority as ProjectTaskPriority;
      const pending = isPendingTask(task);
      return (
        <DraggableTask taskId={task.id} lane={laneIndex} disabled={pending || !canUpdateTask}>
          <TaskRow
            title={task.title}
            status={status}
            priority={priority}
            priorityLabel={labels.priority[priority]}
            due={task.dueAt == null ? undefined : date.formatDayMonth(new Date(task.dueAt))}
            overdue={task.dueAt != null && task.dueAt < today}
            statusTag={
              status === 'backlog' || status === 'canceled' ? labels.status[status] : undefined
            }
            statusOptions={labels.statusOptions}
            statusMenuTitle={t('screens.projects.select-status')}
            closeLabel={t('screens.projects.close')}
            pending={pending}
            onChangeStatus={(next) => changeStatus(task.id, next)}
            onPress={() => openTask(task.id)}
          />
        </DraggableTask>
      );
    },
    [canUpdateTask, changeStatus, date, isPendingTask, labels, openTask, t, today]
  );

  const laneRenderers = useMemo(
    () =>
      Object.fromEntries(
        TASK_LANES.map((lane, laneIndex) => [
          lane.key,
          (task: IProjectTaskCacheRow) => renderTask(task, laneIndex),
        ])
      ) as Record<TaskLaneKey, (task: IProjectTaskCacheRow) => ReactElement>,
    [renderTask]
  );

  return (
    <>
      <AppScreen
        aside={
          isExpanded && projects.length > 0 ? (
            <ProjectAside
              projects={projects}
              activeId={activeId}
              countLabel={countLabel}
              progress={ratio}
              statusLabels={labels.projectStatus}
              upcoming={upcoming}
              onSelect={setSelectedId}
              onOpenTask={openTask}
              onCreate={canCreateProject ? () => openProjectForm(false) : undefined}
            />
          ) : undefined
        }>
        <Animated.View entering={screenIn} className="flex-1 gap-5">
          <View className="flex-row items-center justify-between">
            <IconButton
              icon="arrow-left"
              label={t('common.back')}
              onPress={() => router.replace('/')}
            />
            <Text variant="title">{t(SCREEN_TITLE_KEYS.projects)}</Text>
            {canCreateProject ? (
              <IconButton
                icon="plus"
                label={t('screens.projects.new-project')}
                onPress={() => openProjectForm(false)}
              />
            ) : (
              <View className="size-11" />
            )}
          </View>

          {projects.length === 0 ? (
            <EmptyState
              icon="list-todo"
              title={t('screens.projects.empty')}
              hint={t('screens.projects.empty-hint')}
              action={
                canCreateProject ? (
                  <Button onPress={() => openProjectForm(false)}>
                    <Text>{t('screens.projects.new-project')}</Text>
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {isExpanded ? null : (
                <ProjectSwitcher
                  projects={projects.map((project) => ({
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
                status={activeStatus}
                statusLabel={labels.projectStatus[activeStatus] ?? ''}
                countLabel={countLabel}
                percentLabel={t('screens.projects.progress-percent', {
                  percent: String(Math.round(ratio * 100)),
                })}
                progress={ratio}
                editLabel={t('common.edit')}
                newTaskLabel={t('screens.projects.new-task')}
                onEdit={
                  can('project', 'update') && activeId && !activePending
                    ? () => openProjectForm(true)
                    : undefined
                }
                onNewTask={canCreateTask ? () => openNewTask('todo') : undefined}
              />

              <TaskBoard onMoveTask={canUpdateTask ? moveTask : undefined}>
                {TASK_LANES.map((lane) => (
                  <TaskLane
                    key={lane.key}
                    label={labels.lane[lane.key]}
                    toneClassName={lane.toneClassName}
                    emptyLabel={t('screens.projects.lane-empty')}
                    addLabel={t('screens.projects.add-task')}
                    tasks={lanes[lane.key]}
                    renderTask={laneRenderers[lane.key]}
                    onAdd={canCreateTask ? () => openNewTask(lane.createStatus) : undefined}
                  />
                ))}
              </TaskBoard>
            </>
          )}
        </Animated.View>
      </AppScreen>

      <ProjectForm
        open={projectFormOpen}
        onOpenChange={(open) => {
          setProjectFormOpen(open);
          if (!open) setEditingProject(false);
        }}
        project={editingProject ? (activeProject ?? null) : null}
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
    </>
  );
}
