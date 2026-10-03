import { View } from 'react-native';
import type { ProjectStatus } from '@/core/types';
import { FilterChips } from '@/shared/components/ui/filter-chips';
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
      <FilterChips
        scroll
        contentClassName="px-5 py-1"
        options={projects.map((project) => ({
          value: project.id,
          label: project.name,
          leading: <View className={cn('size-2 rounded-full', PROJECT_STATUS_TONE[project.status])} />,
        }))}
        value={activeId}
        onChange={onSelect}
      />
    </View>
  );
}
