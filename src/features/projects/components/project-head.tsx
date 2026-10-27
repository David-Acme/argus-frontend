import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import type { IconGlyph } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import type { MenuItem } from '@/shared/ui/menu';
import { Meter } from '@/shared/ui/meter';
import { Notice } from '@/shared/ui/notice';
import { Text } from '@/shared/ui/text';
import type { ProjectView } from '@/features/projects/hooks/use-project-view';
import { projectMenu } from '@/features/projects/model/project-rights';
import type { ProjectMenuKey } from '@/features/projects/model/project-rights';
import { progressFraction } from '@/features/projects/model/project-words';

export type ProjectMenuHandlers = Record<ProjectMenuKey, () => void>;

export type ProjectMenuProps = {
  view: ProjectView;
  ask: boolean;
  handlers: ProjectMenuHandlers;
};

export type ProjectHeadProps = { view: ProjectView };

export type ProjectTitleProps = ProjectMenuProps;

const MENU_LABEL: Record<ProjectMenuKey, TranslationKey> = {
  members: 'screens.projects.members',
  edit: 'screens.projects.edit-project',
  ask: 'screens.projects.ask-argus',
};

const MENU_ICON: Record<ProjectMenuKey, IconGlyph> = {
  members: 'users',
  edit: 'sliders',
  ask: 'mic',
};

export function ProjectMenu({ view, ask, handlers }: ProjectMenuProps) {
  const { t } = useTranslation();
  const items: MenuItem[] = projectMenu({ rights: view.rights, ask }).map((key) => ({
    label: t(MENU_LABEL[key]),
    icon: MENU_ICON[key],
    onPress: handlers[key],
  }));
  const [first, second, ...rest] = items;
  if (!first) return null;
  if (!second)
    return (
      <Button iconOnly icon={first.icon ?? 'more'} label={first.label} onPress={first.onPress} />
    );
  return (
    <Menu
      label={t('screens.projects.more', { name: view.project.name })}
      items={[first, second, ...rest]}
    />
  );
}

export function ProjectHead({ view }: ProjectHeadProps) {
  const { t } = useTranslation();
  const { project, tasks, rights, line } = view;
  return (
    <View className="gap-3">
      <Text variant="meta" tone="2">
        {line}
      </Text>
      {tasks.progress.total > 0 ? (
        <Meter
          fraction={progressFraction(tasks.progress)}
          label={t('screens.projects.progress-of', { name: project.name })}
        />
      ) : null}
      {project.description ? <Text variant="body">{project.description}</Text> : null}
      {rights.viewOnly ? (
        <Notice icon="eye" title={t('screens.projects.read-only')} inline />
      ) : null}
    </View>
  );
}

export function ProjectTitle(props: ProjectTitleProps) {
  return (
    <View className="min-h-top-bar flex-row items-center gap-2">
      <View className="min-w-0 flex-1">
        <Text variant="title" heading={2}>
          {props.view.project.name}
        </Text>
      </View>
      <ProjectMenu {...props} />
    </View>
  );
}
