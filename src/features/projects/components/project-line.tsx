import { clsx } from 'clsx';
import { useContext } from 'react';
import { View } from 'react-native';
import type { IProjectCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Icon } from '@/shared/ui/icon';
import { Meter } from '@/shared/ui/meter';
import { PressableSurface } from '@/shared/ui/pressable';
import { RowPosition } from '@/shared/ui/row';
import { Text } from '@/shared/ui/text';
import { useProjectSummary } from '@/features/projects/hooks/use-project-view';
import { progressFraction } from '@/features/projects/model/project-words';

export type ProjectLineProps = {
  project: IProjectCacheRow;
  selected: boolean;
  onOpen: (id: string) => void;
};

const FRAME = 'min-h-row flex-row items-center gap-row-gap px-row-x py-row-y web:hover:bg-fill';

export function ProjectLine({ project, selected, onOpen }: ProjectLineProps) {
  const { t } = useTranslation();
  const { index } = useContext(RowPosition);
  const { line, progress } = useProjectSummary(project);
  return (
    <PressableSurface
      a11y={{ label: `${project.name}, ${line}`, role: 'button', selected }}
      onPress={() => onOpen(project.id)}
      pressed={{ fill: true }}
      testID={`project-row-${project.id}`}
      className={clsx(FRAME, selected && 'bg-fill')}>
      {index > 0 ? (
        <View className="right-row-x left-row-x border-line absolute top-0 border-t" />
      ) : null}
      <Avatar icon="grid" />
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle">{project.name}</Text>
        <View className="mt-row-meta-gap">
          <Text variant="rowMeta">{line}</Text>
        </View>
        {progress.total > 0 ? (
          <View className="mt-2">
            <Meter
              fraction={progressFraction(progress)}
              label={t('screens.projects.progress-of', { name: project.name })}
            />
          </View>
        ) : null}
      </View>
      <Icon name="chev" size="small" tone="text-3" />
    </PressableSurface>
  );
}
