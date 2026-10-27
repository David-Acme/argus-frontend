import { View } from 'react-native';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import type { ProjectsScreenState } from '@/features/projects/hooks/use-projects-screen';
import type { ProjectView } from '@/features/projects/hooks/use-project-view';
import type { ProjectMenuHandlers } from '@/features/projects/components/project-head';
import {
  ProjectHead,
  ProjectMenu,
  ProjectTitle,
} from '@/features/projects/components/project-head';
import { ProjectList } from '@/features/projects/components/project-list';
import { ProjectMembersDialog } from '@/features/projects/components/project-members-dialog';
import { ProjectSheet } from '@/features/projects/components/project-sheet';
import { ProjectsGuide } from '@/features/projects/components/projects-guide';
import { TaskBoard } from '@/features/projects/components/task-board';
import { TaskGroups } from '@/features/projects/components/task-groups';
import { TaskSheet } from '@/features/projects/components/task-sheet';

export type ProjectsLayoutProps = { state: ProjectsScreenState };

type ViewProps = ProjectsLayoutProps & { view: ProjectView };

type FabProps = ProjectsLayoutProps & { phone: boolean };

function TaskFab({ state, phone }: FabProps) {
  const { t } = useTranslation();
  const bottom = useBottomNavInset();
  if (!state.newTask) return null;
  return (
    <View
      className={phone ? 'absolute right-4' : 'absolute right-6 bottom-6'}
      style={phone ? { bottom } : undefined}>
      <Button
        iconOnly
        fab
        icon="plus"
        label={t('screens.projects.new-task')}
        onPress={state.newTask}
      />
    </View>
  );
}

function NewProject({ state }: ProjectsLayoutProps) {
  const { t } = useTranslation();
  if (!state.newProject) return null;
  return (
    <Button
      iconOnly
      icon="plus"
      label={t('screens.projects.new-project')}
      onPress={state.newProject}
    />
  );
}

function useMenuHandlers({ state, view }: ViewProps): ProjectMenuHandlers {
  return {
    members: state.openMembers,
    edit: () => state.projectForm.startEdit(view.project),
    ask: () => state.askAbout?.(view.project),
  };
}

function Tasks({ state, view }: ViewProps) {
  if (state.layout === 'board' && view.tasks.rows.length > 0)
    return <TaskBoard view={view} context={state.context} />;
  return <TaskGroups view={view} context={state.context} onCreate={state.newTask} />;
}

function Overlays({ state }: ProjectsLayoutProps) {
  const { view } = state;
  return (
    <>
      <TaskSheet form={state.taskForm} projects={view ? [] : state.projects.rows} now={state.now} />
      <ProjectSheet form={state.projectForm} canRemove={view?.rights.removeProject ?? false} />
      {view ? (
        <ProjectMembersDialog
          open={state.membersOpen}
          onOpenChange={(open) => {
            if (!open) state.closeMembers();
          }}
          projectId={view.project.id}
          projectName={view.project.name}
          ownerId={view.project.ownerId}
          members={view.members.rows}
          isPending={view.members.isPending}
          people={view.members.people}
        />
      ) : null}
    </>
  );
}

export function PhoneProjects({ state }: ProjectsLayoutProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1">
      <Screen
        title={t('screens.projects.title')}
        back={{ label: t('screens.projects.back-agenda'), onPress: state.toAgenda }}
        actions={<NewProject state={state} />}>
        <ProjectList
          projects={state.projects.rows}
          selected={null}
          onOpen={state.open}
          onCreate={state.newProject}
        />
      </Screen>
      <Overlays state={state} />
    </View>
  );
}

export function PhoneProject({ state, view }: ViewProps) {
  const { t } = useTranslation();
  const handlers = useMenuHandlers({ state, view });
  return (
    <View className="flex-1">
      <Screen
        title={view.project.name}
        back={{ label: t('screens.projects.back-projects'), onPress: state.toProjects }}
        actions={<ProjectMenu view={view} ask={state.askAbout !== null} handlers={handlers} />}>
        <ProjectHead view={view} />
        <TaskGroups view={view} context={state.context} onCreate={state.newTask} />
      </Screen>
      <TaskFab state={state} phone />
      <Overlays state={state} />
    </View>
  );
}

function DetailColumn({ state, view }: ViewProps) {
  const { t } = useTranslation();
  const handlers = useMenuHandlers({ state, view });
  return (
    <ScreenColumn label={t('screens.projects.detail')}>
      <ProjectTitle view={view} ask={state.askAbout !== null} handlers={handlers} />
      <ProjectHead view={view} />
      <Tasks state={state} view={view} />
    </ScreenColumn>
  );
}

function GuideColumn() {
  const { t } = useTranslation();
  return (
    <ScreenColumn label={t('screens.projects.detail')}>
      <ProjectsGuide />
    </ScreenColumn>
  );
}

export function PanesProjects({ state }: ProjectsLayoutProps) {
  const { t } = useTranslation();
  const { view } = state;
  return (
    <>
      <Screen
        columns="panes"
        title={t('screens.projects.title')}
        back={{ label: t('screens.projects.back-agenda'), onPress: state.toAgenda }}
        actions={<NewProject state={state} />}>
        <ScreenColumns>
          <ScreenColumn width={size.columnAside} label={t('screens.projects.list')}>
            <ProjectList
              projects={state.projects.rows}
              selected={view?.project.id ?? null}
              onOpen={state.open}
              onCreate={state.newProject}
            />
          </ScreenColumn>
          <View className="relative min-w-0 flex-1">
            {view ? <DetailColumn state={state} view={view} /> : <GuideColumn />}
            <TaskFab state={state} phone={false} />
          </View>
        </ScreenColumns>
      </Screen>
      <Overlays state={state} />
    </>
  );
}
