import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { IS_NATIVE } from '@/shared/constants';
import { laneAtPosition } from '@/features/projects/model/task-lanes';

export type TaskGhostRect = {
  x: number;
  y: number;
  width: number;
};

export type TaskGhost = TaskGhostRect & {
  taskId: string;
  node: ReactNode;
};

export type TaskDragState = {
  lanes: number;
  origin: SharedValue<number>;
  span: SharedValue<number>;
  hoverLane: SharedValue<number>;
  sourceLane: SharedValue<number>;
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostTaskId: string | null;
  lift: (ghost: TaskGhost) => void;
  settle: (taskId: string) => void;
  drop: (taskId: string, lane: number) => void;
  markDrag: () => void;
  pressAllowed: () => boolean;
};

export type PressGuard = Pick<TaskDragState, 'markDrag' | 'pressAllowed'>;

type TaskDropZoneProps = {
  index: number;
  children: ReactNode;
};

type DraggableTaskProps = {
  taskId: string;
  lane: number;
  disabled?: boolean;
  children: ReactNode;
};

type TaskGhostLayerProps = {
  ghost: TaskGhost | null;
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
};

const LONG_PRESS_MS = 280;
const POINTER_SLOP = 6;
const SETTLE_SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

const TaskDragContext = createContext<TaskDragState | null>(null);

const HIDDEN = { opacity: 0 } as const;

export function createPressGuard(windowMs: number): PressGuard {
  let lastDragAt = 0;
  return {
    markDrag: () => {
      lastDragAt = Date.now();
    },
    pressAllowed: () => Date.now() - lastDragAt > windowMs,
  };
}

export const TaskDragProvider = TaskDragContext.Provider;

export function useTaskPressGuard(): (action?: () => void) => void {
  const drag = useContext(TaskDragContext);
  return (action) => {
    if (drag && !drag.pressAllowed()) return;
    action?.();
  };
}

export function TaskDropZone({ index, children }: TaskDropZoneProps) {
  const drag = useContext(TaskDragContext);
  const reduceMotion = useReducedMotion();
  const zoneStyle = useAnimatedStyle(() => ({
    zIndex: drag && drag.sourceLane.value === index ? 10 : 0,
  }));
  const ringStyle = useAnimatedStyle(() => {
    const active =
      drag != null && drag.hoverLane.value === index && drag.sourceLane.value !== index;
    return {
      opacity: reduceMotion ? Number(active) : withTiming(Number(active), { duration: 140 }),
    };
  });

  return (
    <Animated.View style={zoneStyle} className="min-w-0 flex-1 basis-0">
      {children}
      <Animated.View
        pointerEvents="none"
        style={ringStyle}
        className="border-accent bg-accent/5 absolute inset-0 rounded-3xl border-2"
      />
    </Animated.View>
  );
}

export function TaskGhostLayer({ ghost, offsetX, offsetY }: TaskGhostLayerProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }, { scale: 1.03 }],
  }));

  if (!ghost) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: ghost.x, top: ghost.y, width: ghost.width, zIndex: 50 },
        style,
      ]}>
      {ghost.node}
    </Animated.View>
  );
}

export function DraggableTask({ taskId, lane, disabled = false, children }: DraggableTaskProps) {
  const drag = useContext(TaskDragContext);
  const reduceMotion = useReducedMotion();
  const rowWidth = useSharedValue(0);
  const dragging = useSharedValue(false);
  const enabled = drag != null && !disabled;
  const hidden = drag?.ghostTaskId === taskId;

  const liftRow = useCallback(
    (x: number, y: number, width: number) => drag?.lift({ taskId, node: children, x, y, width }),
    [children, drag, taskId]
  );

  const measure = (event: LayoutChangeEvent) => {
    rowWidth.value = event.nativeEvent.layout.width;
  };

  const gesture = useMemo(() => {
    const pan = Gesture.Pan().enabled(enabled);
    const activated = IS_NATIVE
      ? pan.activateAfterLongPress(LONG_PRESS_MS)
      : pan.minDistance(POINTER_SLOP);
    return activated
      .onStart((event) => {
        if (!drag) return;
        dragging.value = true;
        drag.ghostX.value = 0;
        drag.ghostY.value = 0;
        drag.sourceLane.value = lane;
        scheduleOnRN(liftRow, event.absoluteX - event.x, event.absoluteY - event.y, rowWidth.value);
        scheduleOnRN(drag.markDrag);
      })
      .onUpdate((event) => {
        if (!drag) return;
        drag.ghostX.value = event.translationX;
        drag.ghostY.value = event.translationY;
        drag.hoverLane.value = laneAtPosition(
          event.absoluteX,
          drag.origin.value,
          drag.span.value,
          drag.lanes
        );
      })
      .onEnd((event) => {
        if (!drag) return;
        const target = laneAtPosition(
          event.absoluteX,
          drag.origin.value,
          drag.span.value,
          drag.lanes
        );
        if (target >= 0 && target !== lane) {
          scheduleOnRN(drag.drop, taskId, target);
          scheduleOnRN(drag.settle, taskId);
          return;
        }
        if (reduceMotion) {
          drag.ghostX.value = 0;
          drag.ghostY.value = 0;
          scheduleOnRN(drag.settle, taskId);
          return;
        }
        drag.ghostX.value = withSpring(0, SETTLE_SPRING);
        drag.ghostY.value = withSpring(0, SETTLE_SPRING, (finished) => {
          if (finished) scheduleOnRN(drag.settle, taskId);
        });
      })
      .onFinalize(() => {
        if (!drag || !dragging.value) return;
        dragging.value = false;
        scheduleOnRN(drag.markDrag);
        drag.hoverLane.value = -1;
        drag.sourceLane.value = -1;
      });
  }, [drag, dragging, enabled, lane, liftRow, reduceMotion, rowWidth, taskId]);

  if (!drag) return children;

  return (
    <GestureDetector gesture={gesture}>
      <View onLayout={measure} style={hidden ? HIDDEN : undefined}>
        {children}
      </View>
    </GestureDetector>
  );
}
