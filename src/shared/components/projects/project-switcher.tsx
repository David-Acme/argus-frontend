import { Pressable, ScrollView, View } from 'react-native';
import type { ProjectStatus } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { PROJECT_STATUS_TONE } from './project-card-row';

type ProjectSwitcherItem = {
  id: string;
  name: string;
  status: ProjectStatus;
};

type ProjectSwitcherProps = {
  projects: readonly ProjectSwitcherItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ProjectSwitcher({ projects, activeId, onSelect }: ProjectSwitcherProps) {
  return (
    <View className="-mx-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 py-1">
        {projects.map((project) => {
          const selected = project.id === activeId;
          return (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={project.name}
              onPress={() => onSelect(project.id)}
              className={cn(
                'h-10 max-w-[240px] flex-row items-center gap-2 rounded-full px-4 active:opacity-80',
                selected ? 'bg-interactive' : 'bg-card shadow-md shadow-black/[0.05]'
              )}>
              <View className={cn('size-2 rounded-full', PROJECT_STATUS_TONE[project.status])} />
              <Text
                variant="label"
                numberOfLines={1}
                className={selected ? 'text-foreground-on-interactive' : 'text-foreground'}>
                {project.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
