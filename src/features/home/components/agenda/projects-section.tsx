import { useRouter } from 'expo-router';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { DashboardProjectCard } from '@/core/types';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { listLimit } from '@/features/agenda';
import { nextTask, openProjects, projectMeta } from '@/features/home/model/agenda-projects';

type ProjectRowProps = { project: DashboardProjectCard; onOpen: (id: string) => void };

function ProjectRow({ project, onOpen }: ProjectRowProps) {
  const { t } = useTranslation();
  const tasks = useViewCacheRows<IProjectTaskCacheRow>(VIEW_CACHE_KEYS.projectTasks, project.id);
  return (
    <Row
      leading={<Avatar icon="grid" />}
      title={project.name}
      meta={projectMeta(project, nextTask(tasks), t)}
      chevron
      onPress={() => onOpen(project.id)}
      testID={`project-row-${project.id}`}
    />
  );
}

export function ProjectsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const column = useInScreenColumn();
  const { has } = useCapabilities();
  const cards = useViewCacheRows<DashboardProjectCard>(VIEW_CACHE_KEYS.dashboardProjects);
  const projects = openProjects(cards, listLimit(column));
  const openAll = () => router.push('/projects');
  const openOne = (id: string) => router.push({ pathname: '/projects', params: { id } });
  if (!has(CAPABILITY.projectsRead) || projects.length === 0) return null;
  return (
    <Section
      title={t('screens.home.agenda-sections.projects')}
      action={{
        label: t('screens.home.agenda-sections.open-projects'),
        onPress: openAll,
      }}>
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} onOpen={openOne} />
      ))}
    </Section>
  );
}
