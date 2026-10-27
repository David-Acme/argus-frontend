import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ColumnGrowProvider } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import { LANE_LABEL, TASK_LANES } from '@/features/projects/constants/projects.constant';
import type { ProjectView } from '@/features/projects/hooks/use-project-view';
import type { TaskLaneKey } from '@/features/projects/model/task-lanes';
import type { TaskContext } from '@/features/projects/model/task-view';
import {
  createPressGuard,
  DraggableTask,
  TaskDragProvider,
  TaskDropZone,
  TaskGhostLayer,
} from '@/features/projects/components/task-drag';
import type { TaskDragState, TaskGhost } from '@/features/projects/components/task-drag';
import { TaskRow } from '@/features/projects/components/task-row';

export type TaskBoardProps = { view: ProjectView; context: TaskContext };

type LaneProps = TaskBoardProps & { lane: TaskLaneKey; index: number };

const PRESS_GUARD_MS = 350;

const DROP_SETTLE_MS = 160;

function Lane({ view, context, lane, index }: LaneProps) {
  const { t } = useTranslation();
  const tasks = view.lanes[lane];
  return (
    <TaskDropZone index={index}>
      {tasks.length === 0 ? (
        <Section
          title={t(LANE_LABEL[lane])}
          meta={String(tasks.length)}
          variant="plain"
          testID={`task-lane-${lane}`}>
          <View className="px-section-head-x">
            <Text variant="meta" tone="3" numberOfLines={1}>
              {t(
                context.editable
                  ? 'screens.projects.lane-empty.drop'
                  : 'screens.projects.lane-empty.wait'
              )}
            </Text>
          </View>
        </Section>
      ) : (
        <Section
          title={t(LANE_LABEL[lane])}
          meta={String(tasks.length)}
          testID={`task-lane-${lane}`}>
          {tasks.map((task) => (
            <DraggableTask key={task.id} taskId={task.id} lane={index} disabled={!context.editable}>
              <TaskRow task={task} context={context} />
            </DraggableTask>
          ))}
        </Section>
      )}
    </TaskDropZone>
  );
}

function useBoardDrag(view: ProjectView, context: TaskContext) {
  const boardRef = useRef<View>(null);
  const [pressGuard] = useState(() => createPressGuard(PRESS_GUARD_MS));
  const [ghost, setGhost] = useState<TaskGhost | null>(null);
  const origin = useSharedValue(0);
  const span = useSharedValue(0);
  const hoverLane = useSharedValue(-1);
  const sourceLane = useSharedValue(-1);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const drop = (taskId: string, laneIndex: number) => {
    const task = view.tasks.rows.find((candidate) => candidate.id === taskId);
    const spec = TASK_LANES[laneIndex];
    if (task && spec) context.handlers.setStatus(task, spec.status);
  };
  const drag: TaskDragState = {
    lanes: TASK_LANES.length,
    origin,
    span,
    hoverLane,
    sourceLane,
    ghostX,
    ghostY,
    ghostTaskId: ghost?.taskId ?? null,
    lift: (next) =>
      boardRef.current?.measureInWindow((x, y) =>
        setGhost({ ...next, x: next.x - x, y: next.y - y })
      ),
    settle: (taskId) =>
      setTimeout(
        () => setGhost((current) => (current?.taskId === taskId ? null : current)),
        DROP_SETTLE_MS
      ),
    drop,
    ...pressGuard,
  };
  const measure = (event: LayoutChangeEvent) => {
    span.value = event.nativeEvent.layout.width / TASK_LANES.length;
    boardRef.current?.measureInWindow((x) => {
      origin.value = x;
    });
  };
  return { boardRef, drag, ghost, measure };
}

export function TaskBoard({ view, context }: TaskBoardProps) {
  const { boardRef, drag, ghost, measure } = useBoardDrag(view, context);
  const guarded: TaskContext = {
    ...context,
    handlers: {
      ...context.handlers,
      edit: (task) => {
        if (drag.pressAllowed()) context.handlers.edit(task);
      },
    },
  };
  return (
    <TaskDragProvider value={context.editable ? drag : null}>
      <ColumnGrowProvider value={false}>
        <View ref={boardRef} onLayout={measure} className="flex-row items-start gap-4">
          {TASK_LANES.map((spec, index) => (
            <Lane key={spec.key} view={view} context={guarded} lane={spec.key} index={index} />
          ))}
          <TaskGhostLayer ghost={ghost} offsetX={drag.ghostX} offsetY={drag.ghostY} />
        </View>
      </ColumnGrowProvider>
    </TaskDragProvider>
  );
}
