import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { IProjectCacheRow } from '@/core/interfaces';
import { NEW_ITEM_PARAM } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useWindowLayout, useWindowWidth } from '@/shared/theme';
import { useArgusDraft } from '@/features/agenda';
import { useProjects } from '@/features/projects/hooks/use-project-data';
import { useProjectForm } from '@/features/projects/hooks/use-project-form';
import { useProjectView } from '@/features/projects/hooks/use-project-view';
import type { ProjectView } from '@/features/projects/hooks/use-project-view';
import { useTaskActions } from '@/features/projects/hooks/use-task-actions';
import { useTaskForm } from '@/features/projects/hooks/use-task-form';
import type { TaskForm } from '@/features/projects/hooks/use-task-form';
import type { ProjectForm } from '@/features/projects/hooks/use-project-form';
import { taskLayoutOf } from '@/features/projects/model/task-lanes';
import type { TaskContext } from '@/features/projects/model/task-view';

type ProjectsParams = { id?: string; task?: string; new?: string };

type DeepLinkInput = {
  params: ProjectsParams;
  view: ProjectView | null;
  projects: readonly IProjectCacheRow[];
  taskForm: TaskForm;
  projectForm: ProjectForm;
};

const AGENDA_HREF = '/agenda';

const PROJECTS_HREF = '/projects';

function useNewLink({ params, view, projects, taskForm, projectForm }: DeepLinkInput) {
  const { can } = useCapabilities();
  const [pendingNew, setPendingNew] = useState(params.new ?? '');
  const target = view?.project.id ?? projects[0]?.id ?? '';
  if (pendingNew === NEW_ITEM_PARAM.project && can('project', 'create')) {
    setPendingNew('');
    projectForm.startNew();
  }
  if (pendingNew === NEW_ITEM_PARAM.task && can('project_task', 'create') && target) {
    setPendingNew('');
    taskForm.startNew({ project: target, lane: 'todo' });
  }
}

function useTaskLink({ params, view, taskForm }: DeepLinkInput) {
  const [pendingTask, setPendingTask] = useState(params.task ?? '');
  const linked = pendingTask ? view?.tasks.rows.find((task) => task.id === pendingTask) : undefined;
  if (linked && view?.rights.editTask) {
    setPendingTask('');
    taskForm.startEdit(linked);
  }
}

export function useProjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<ProjectsParams>();
  const { windowClass } = useWindowLayout();
  const { can } = useCapabilities();
  const ask = useArgusDraft();
  const projects = useProjects();
  const compact = windowClass === 'compact';
  const [picked, setPicked] = useState(params.id ?? '');
  const [membersOpen, setMembersOpen] = useState(false);
  const chosen = compact ? (params.id ?? '') : picked;
  const current =
    projects.rows.find((project) => project.id === chosen) ??
    (compact ? null : (projects.rows[0] ?? null));
  const view = useProjectView({
    project: current,
    pending: current ? projects.isPending(current) : false,
  });
  const taskForm = useTaskForm();
  const projectForm = useProjectForm();
  const actions = useTaskActions();
  const date = useDateFormatter();
  const width = useWindowWidth();
  const [now] = useState(() => Date.now());
  const context: TaskContext = {
    now,
    date,
    t,
    editable: view?.rights.editTask ?? false,
    handlers: { ...actions, edit: taskForm.startEdit },
  };
  const links = { params, view, projects: projects.rows, taskForm, projectForm };
  useNewLink(links);
  useTaskLink(links);
  const leave = (href: typeof AGENDA_HREF | typeof PROJECTS_HREF) =>
    router.canGoBack() ? router.back() : router.replace(href);
  return {
    projects,
    view,
    now,
    context,
    layout: taskLayoutOf(width),
    taskForm,
    projectForm,
    actions,
    compact,
    membersOpen,
    openMembers: () => setMembersOpen(true),
    newTask: view?.rights.createTask
      ? () => taskForm.startNew({ project: view.project.id, lane: 'todo' })
      : undefined,
    newProject: can('project', 'create') ? projectForm.startNew : undefined,
    closeMembers: () => setMembersOpen(false),
    open: (id: string) =>
      compact ? router.push({ pathname: '/projects/[id]', params: { id } }) : setPicked(id),
    toAgenda: () => leave(AGENDA_HREF),
    toProjects: () => leave(PROJECTS_HREF),
    askAbout: ask
      ? (project: IProjectCacheRow) => ask(t('screens.projects.ask-about', { name: project.name }))
      : null,
  };
}

export type ProjectsScreenState = ReturnType<typeof useProjectsScreen>;
