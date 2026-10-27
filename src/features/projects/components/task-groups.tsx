import { useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import { Section } from '@/shared/ui/section';
import { Ideas } from '@/features/agenda';
import { LANE_LABEL, TASK_LANES } from '@/features/projects/constants/projects.constant';
import type { ProjectView } from '@/features/projects/hooks/use-project-view';
import type { TaskContext } from '@/features/projects/model/task-view';
import { TaskRow } from '@/features/projects/components/task-row';

export type TaskGroupsProps = { view: ProjectView; context: TaskContext; onCreate?: () => void };

export type TasksEmptyProps = { name: string; onCreate?: () => void };

export function TasksEmpty({ name, onCreate }: TasksEmptyProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={4}>
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
      {onCreate ? (
        <Ideas
          ideas={[
            t('screens.projects.empty.idea-task', { name }),
            t('screens.projects.empty.idea-split', { name }),
          ]}
        />
      ) : null}
    </Stack>
  );
}

export function TaskGroups({ view, context, onCreate }: TaskGroupsProps) {
  const { t } = useTranslation();
  const [doneOpen, setDoneOpen] = useState(false);
  if (view.tasks.rows.length === 0)
    return <TasksEmpty name={view.project.name} onCreate={onCreate} />;
  return TASK_LANES.map(({ key }) => {
    const tasks = view.lanes[key];
    if (tasks.length === 0) return null;
    const collapsed = key === 'done' && !doneOpen;
    return (
      <Section
        key={key}
        title={t(LANE_LABEL[key])}
        meta={String(tasks.length)}
        variant={collapsed ? 'plain' : 'grouped'}
        action={
          key === 'done'
            ? {
                label: doneOpen
                  ? t('screens.projects.hide-done')
                  : t('screens.projects.show-done', { count: tasks.length }),
                onPress: () => setDoneOpen(!doneOpen),
              }
            : undefined
        }
        testID={`task-lane-${key}`}>
        {collapsed
          ? null
          : tasks.map((task) => <TaskRow key={task.id} task={task} context={context} />)}
      </Section>
    );
  });
}
