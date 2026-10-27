import type { ReactElement } from 'react';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { layout } from '@/shared/theme';
import { SkeletonRow } from '@/shared/ui/resource-view';

export type DoneLaneListProps = {
  tasks: readonly IProjectTaskCacheRow[];
  paging: InfiniteListState;
  renderTask: (task: IProjectTaskCacheRow) => ReactElement;
};

const ROW_ESTIMATE = 56;

const keyOf = (task: IProjectTaskCacheRow) => task.id;

export function DoneLaneList({ tasks, paging, renderTask }: DoneLaneListProps) {
  const { t } = useTranslation();
  return (
    <InfiniteList
      data={tasks}
      keyOf={keyOf}
      renderItem={renderTask}
      estimatedItemSize={ROW_ESTIMATE}
      paging={paging}
      maxHeight={layout.laneListCap}
      skeleton={<SkeletonRow short />}
      endLabel={t('screens.projects.done-end')}
    />
  );
}
