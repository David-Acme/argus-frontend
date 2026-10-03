import type { DashboardProjectCard } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ProjectCard } from './project-card';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';

type ProjectGridProps = {
  projects: readonly DashboardProjectCard[];
  onSelect: (id: string) => void;
  createLabel?: string;
  onCreate?: () => void;
};

function columnsFor(width: number): number {
  if (width >= 840) return 4;
  if (width >= 600) return 3;
  if (width >= 360) return 2;
  return 1;
}

export function ProjectGrid({ projects, onSelect, createLabel, onCreate }: ProjectGridProps) {
  const { t } = useTranslation();
  return (
    <ResponsiveGrid
      id="dashboard-projects"
      items={projects}
      keyOf={(project) => project.id}
      renderItem={(project) => (
        <ProjectCard
          title={project.name}
          description={
            project.description ||
            t('screens.home.project-tasks', { done: String(project.done), total: String(project.total) })
          }
          done={project.done}
          total={project.total}
          tasksLabel={t('screens.home.project-tasks-label')}
          progressLabel={`${Math.round(project.progress * 100)}%`}
          onPress={() => onSelect(project.id)}
        />
      )}
      columnsFor={columnsFor}
      gap={12}
      trailing={
        onCreate && createLabel
          ? (width) => <CreateTile label={createLabel} style={{ width }} onPress={onCreate} />
          : undefined
      }
    />
  );
}
