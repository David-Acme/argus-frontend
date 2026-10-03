import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import type { DashboardProjectCard } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ProjectCard } from './project-card';

type ProjectGridProps = {
  projects: readonly DashboardProjectCard[];
  onSelect: (id: string) => void;
  createLabel?: string;
  onCreate?: () => void;
};

const GAP = 12;

function columnsFor(width: number): number {
  if (width >= 840) return 4;
  if (width >= 600) return 3;
  if (width >= 360) return 2;
  return 1;
}

export function ProjectGrid({ projects, onSelect, createLabel, onCreate }: ProjectGridProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const columns = columnsFor(width);
  const tileWidth = width > 0 ? (width - GAP * (columns - 1)) / columns : undefined;
  const freeSlots = (columns - (projects.length % columns)) % columns;
  const createWidth = tileWidth && freeSlots > 0 ? tileWidth * freeSlots + GAP * (freeSlots - 1) : undefined;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: GAP }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {projects.map((project) => (
        <View key={project.id} style={tileWidth ? { width: tileWidth } : undefined}>
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
        </View>
      ))}
      {onCreate && createLabel && createWidth ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={createLabel}
          onPress={onCreate}
          style={{ width: createWidth }}
          className="border-border items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-8 active:opacity-70 web:hover:bg-card">
          <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
            <Icon name="plus" className="text-foreground-secondary size-5" />
          </View>
          <Text className="text-foreground-secondary text-center font-semibold">{createLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
