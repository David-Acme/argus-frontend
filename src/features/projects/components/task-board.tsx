import { Children, type ReactNode, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import {
  createPressGuard,
  TaskDragProvider,
  TaskDropZone,
  type TaskDragState,
} from '@/features/projects/components/task-drag';

type TaskBoardProps = {
  children: ReactNode;
  onMoveTask?: (taskId: string, lane: number) => void;
};

const SIDE_BY_SIDE_MIN = 600;
const LANE_GAP = 12;
const WIDE_LANE_GAP = 16;
const LANE_INSET = 24;
const LANE_MAX = 360;
const BLEED = 40;
const PRESS_GUARD_MS = 350;

export function TaskBoard({ children, onMoveTask }: TaskBoardProps) {
  const { isCompact } = useWindowClass();
  const [width, setWidth] = useState(0);
  const boardRef = useRef<View>(null);
  const [pressGuard] = useState(() => createPressGuard(PRESS_GUARD_MS));
  const origin = useSharedValue(0);
  const span = useSharedValue(0);
  const hoverLane = useSharedValue(-1);
  const sourceLane = useSharedValue(-1);
  const lanes = Children.toArray(children);
  const laneCount = lanes.length;
  const sideBySide = width > 0 ? width >= SIDE_BY_SIDE_MIN : !isCompact;
  const laneWidth = Math.min(LANE_MAX, Math.max(240, width - LANE_INSET));

  const drag: TaskDragState | null =
    sideBySide && onMoveTask
      ? {
          lanes: laneCount,
          origin,
          span,
          hoverLane,
          sourceLane,
          drop: onMoveTask,
          ...pressGuard,
        }
      : null;

  const measure = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    span.value = (next + WIDE_LANE_GAP) / Math.max(1, laneCount);
    boardRef.current?.measureInWindow((x) => {
      origin.value = x;
    });
  };
  const measureBled = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width - BLEED);

  if (sideBySide) {
    return (
      <TaskDragProvider value={drag}>
        <View
          ref={boardRef}
          className="min-h-[380px] flex-1 flex-row items-stretch gap-4"
          onLayout={measure}>
          {lanes.map((lane, index) => (
            <TaskDropZone key={index} index={index}>
              {lane}
            </TaskDropZone>
          ))}
        </View>
      </TaskDragProvider>
    );
  }

  return (
    <View onLayout={measureBled} className="-mx-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={laneWidth + LANE_GAP}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerClassName="items-stretch px-5 pb-1"
        contentContainerStyle={{ gap: LANE_GAP }}>
        {lanes.map((lane, index) => (
          <View key={index} className="min-h-[340px]" style={{ width: laneWidth }}>
            {lane}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
