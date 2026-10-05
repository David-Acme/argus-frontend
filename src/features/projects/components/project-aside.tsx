import { useCallback } from 'react';
import { View } from 'react-native';
import type { IProjectCacheRow } from '@/core/interfaces';
import type { ProjectStatus } from '@/core/types';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ProjectCardRow } from '@/features/projects/components/project-card-row';
import {
  UpcomingTasksPanel,
  type UpcomingTaskItem,
} from '@/features/projects/components/upcoming-tasks-panel';

type ProjectAsideProps = {
  projects: readonly IProjectCacheRow[];
  activeId: string;
  countLabel: string;
  progress: number;
  statusLabels: Record<ProjectStatus, string>;
  upcoming: readonly UpcomingTaskItem[];
  onSelect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onCreate?: () => void;
};

const PROJECT_ROW_ESTIMATE = 92;
const PROJECT_ROW_GAP = 12;
const PROJECT_LIST_MAX_HEIGHT = 420;

const projectKey = (project: IProjectCacheRow) => project.id;

export function ProjectAside({
  projects,
  activeId,
  countLabel,
  progress,
  statusLabels,
  upcoming,
  onSelect,
  onOpenTask,
  onCreate,
}: ProjectAsideProps) {
  const { t } = useTranslation();

  const renderProject = useCallback(
    (project: IProjectCacheRow) => {
      const active = project.id === activeId;
      const status = project.status as ProjectStatus;
      return (
        <ProjectCardRow
          name={project.name}
          description={project.description}
          status={status}
          statusLabel={statusLabels[status] ?? project.status}
          taskCount={active ? countLabel : (statusLabels[status] ?? '')}
          progress={active ? progress : 0}
          selected={active}
          onPress={() => onSelect(project.id)}
        />
      );
    },
    [activeId, countLabel, onSelect, progress, statusLabels]
  );

  return (
    <View className="flex-1 gap-5">
      <View className="gap-3">
        <SectionHeader title={t('screens.projects.all-projects')} />
        <InfiniteList
          data={projects}
          keyOf={projectKey}
          renderItem={renderProject}
          estimatedItemSize={PROJECT_ROW_ESTIMATE}
          gap={PROJECT_ROW_GAP}
          maxHeight={PROJECT_LIST_MAX_HEIGHT}
          scrollIndicator
          recycle
        />
        {onCreate ? (
          <CreateTile layout="row" label={t('screens.projects.new-project')} onPress={onCreate} />
        ) : null}
      </View>
      <UpcomingTasksPanel
        title={t('screens.projects.upcoming')}
        emptyLabel={t('screens.projects.upcoming-empty')}
        hint={t('screens.projects.upcoming-hint')}
        overdueLabel={t('screens.projects.overdue')}
        items={upcoming}
        onSelect={onOpenTask}
      />
    </View>
  );
}
