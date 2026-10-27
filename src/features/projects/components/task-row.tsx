import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { ProjectTaskStatus } from '@/core/types';
import { Check } from '@/shared/ui/check';
import { hasMenuItems, Menu } from '@/shared/ui/menu';
import type { MenuItem } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { LANE_LABEL, TASK_LANES } from '@/features/projects/constants/projects.constant';
import { taskCheck, taskWords } from '@/features/projects/model/project-words';
import { laneOf } from '@/features/projects/model/task-lanes';
import type { TaskContext } from '@/features/projects/model/task-view';

export type TaskRowProps = { task: IProjectTaskCacheRow; context: TaskContext };

function taskMenu({ task, context }: TaskRowProps): MenuItem[] {
  const { t, handlers } = context;
  const lane = laneOf(task.status);
  const moves: MenuItem[] = TASK_LANES.filter((spec) => spec.key !== lane).map((spec) => ({
    label: t('screens.projects.move-to', { lane: t(LANE_LABEL[spec.key]) }),
    icon: spec.key === 'done' ? 'check' : 'move',
    family: 'state',
    onPress: () => handlers.setStatus(task, spec.status),
  }));
  return [
    ...moves,
    {
      label: t('screens.projects.edit-task'),
      icon: 'pencil',
      family: 'edit',
      onPress: () => handlers.edit(task),
    },
    {
      label: t('screens.projects.remove-task'),
      icon: 'trash',
      destructive: true,
      confirm: {
        title: t('screens.projects.delete-task-title', { title: task.title }),
        body: t('screens.projects.delete-task-body'),
        confirmLabel: t('common.confirm-delete'),
      },
      onPress: () => handlers.remove(task),
    },
  ];
}

export function TaskRow({ task, context }: TaskRowProps) {
  const { t, now, date, editable, handlers } = context;
  const words = taskWords(task, { now, date, t });
  const done = (task.status as ProjectTaskStatus) === 'done';
  const today = date.startOfDay(new Date(now)).getTime();
  const row = (
    <Row
      leading={
        <Check
          state={taskCheck(task, today)}
          label={t(done ? 'screens.projects.reopen' : 'screens.projects.complete', {
            title: task.title,
          })}
          onToggle={editable ? () => handlers.toggle(task) : undefined}
        />
      }
      title={task.title}
      meta={words.meta}
      metaTone={words.alert ? 'alert' : undefined}
      struck={done || task.status === 'canceled'}
      onPress={editable ? () => handlers.edit(task) : undefined}
      testID={`task-row-${task.id}`}
    />
  );
  const items = taskMenu({ task, context });
  if (!editable || !hasMenuItems(items)) return row;
  return (
    <Menu context label={task.title} items={items}>
      {row}
    </Menu>
  );
}
