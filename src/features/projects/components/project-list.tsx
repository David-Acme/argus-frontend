import type { IProjectCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import { Section } from '@/shared/ui/section';
import { projectGroups } from '@/features/projects/model/project-words';
import { ProjectLine } from '@/features/projects/components/project-line';

export type ProjectListProps = {
  projects: readonly IProjectCacheRow[];
  selected: string | null;
  onOpen: (id: string) => void;
  onCreate?: () => void;
};

type ProjectsEmptyProps = Pick<ProjectListProps, 'onCreate'>;

export function ProjectsEmpty({ onCreate }: ProjectsEmptyProps) {
  const { t } = useTranslation();
  if (onCreate)
    return (
      <Empty
        centred
        icon="grid"
        message={t('screens.projects.empty.title')}
        detail={t('screens.projects.empty.body')}
        action={{ label: t('screens.projects.new-project'), onPress: onCreate }}
      />
    );
  return (
    <Notice
      icon="grid"
      title={t('screens.projects.empty.title')}
      body={t('screens.projects.empty.read-only')}
    />
  );
}

type GroupProps = Omit<ProjectListProps, 'projects' | 'onCreate'> & {
  title: string;
  projects: readonly IProjectCacheRow[];
};

function Group({ title, projects, selected, onOpen }: GroupProps) {
  if (projects.length === 0) return null;
  return (
    <Section title={title} meta={String(projects.length)}>
      {projects.map((project) => (
        <ProjectLine
          key={project.id}
          project={project}
          selected={project.id === selected}
          onOpen={onOpen}
        />
      ))}
    </Section>
  );
}

export function ProjectList({ projects, selected, onOpen, onCreate }: ProjectListProps) {
  const { t } = useTranslation();
  if (projects.length === 0) return <ProjectsEmpty onCreate={onCreate} />;
  const { open, closed } = projectGroups(projects);
  return (
    <>
      <Group
        title={t('screens.projects.open')}
        projects={open}
        selected={selected}
        onOpen={onOpen}
      />
      <Group
        title={t('screens.projects.closed')}
        projects={closed}
        selected={selected}
        onOpen={onOpen}
      />
    </>
  );
}
