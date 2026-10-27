import { useState } from 'react';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import { Section } from '@/shared/ui/section';
import { LANE_LABEL, TASK_LANES } from '@/features/projects/constants/projects.constant';
import type { ProjectView } from '@/features/projects/hooks/use-project-view';
import type { TaskContext } from '@/features/projects/model/task-view';
import { DoneLaneList } from '@/features/projects/components/done-lane-list';
import { TaskRow } from '@/features/projects/components/task-row';

export type TaskGroupsProps = { view: ProjectView; context: TaskContext; onCreate?: () => void };

export type TasksEmptyProps = { onCreate?: () => void };

export function TasksEmpty({ onCreate }: TasksEmptyProps) {
  const { t } = useTranslation();
  return (
    <Section variant="plain">
      {onCreate ? (
        <Empty
          centred
          icon="check"
          message={t('screens.projects.line.no-tasks')}
          detail={t('screens.projects.empty.tasks-body')}
          action={{ label: t('screens.projects.new-task'), onPress: onCreate }}
        />
      ) : (
        <Notice
          icon="check"
          title={t('screens.projects.line.no-tasks')}
          body={t('screens.projects.empty.tasks-read-only')}
        />
      )}
    </Section>
  );
}

export function TaskGroups({ view, context, onCreate }: TaskGroupsProps) {
  const { t } = useTranslation();
  const [doneOpen, setDoneOpen] = useState(false);
  if (view.tasks.rows.length === 0) return <TasksEmpty onCreate={onCreate} />;
  return TASK_LANES.map(({ key }) => {
    const tasks = view.lanes[key];
    if (tasks.length === 0) return null;
    const count = key === 'done' ? Math.max(view.tasks.doneTotal, tasks.length) : tasks.length;
    const collapsed = key === 'done' && !doneOpen;
    const renderTask = (task: IProjectTaskCacheRow) => (
      <TaskRow key={task.id} task={task} context={context} />
    );
    return (
      <Section
        key={key}
        title={t(LANE_LABEL[key])}
        meta={String(count)}
        variant={collapsed ? 'plain' : 'grouped'}
        action={
          key === 'done'
            ? {
                label: doneOpen
                  ? t('screens.projects.hide-done')
                  : t('screens.projects.show-done', { count }),
                onPress: () => setDoneOpen(!doneOpen),
              }
            : undefined
        }
        testID={`task-lane-${key}`}>
        {collapsed ? null : key === 'done' ? (
          <DoneLaneList tasks={tasks} paging={view.tasks.donePaging} renderTask={renderTask} />
        ) : (
          tasks.map(renderTask)
        )}
      </Section>
    );
  });
}
