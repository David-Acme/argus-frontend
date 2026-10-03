import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { IS_NATIVE } from '@/shared/constants';
import { laneAtPosition } from '@/features/projects/model/task-lanes';

export type TaskDragState = {
  lanes: number;
  origin: SharedValue<number>;
  span: SharedValue<number>;
  hoverLane: SharedValue<number>;
  sourceLane: SharedValue<number>;
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

const LONG_PRESS_MS = 280;
const POINTER_SLOP = 6;
const SETTLE_SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

const TaskDragContext = createContext<TaskDragState | null>(null);

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

export function DraggableTask({ taskId, lane, disabled = false, children }: DraggableTaskProps) {
  const drag = useContext(TaskDragContext);
  const reduceMotion = useReducedMotion();
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const lifted = useSharedValue(0);
  const dragging = useSharedValue(false);
  const enabled = drag != null && !disabled;

  const gesture = useMemo(() => {
    const pan = Gesture.Pan().enabled(enabled);
    const activated = IS_NATIVE
      ? pan.activateAfterLongPress(LONG_PRESS_MS)
      : pan.minDistance(POINTER_SLOP);
    return activated
      .onStart(() => {
        if (!drag) return;
        dragging.value = true;
        lifted.value = reduceMotion ? 1 : withTiming(1, { duration: 120 });
        drag.sourceLane.value = lane;
        scheduleOnRN(drag.markDrag);
      })
      .onUpdate((event) => {
        if (!drag) return;
        offsetX.value = event.translationX;
        offsetY.value = event.translationY;
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
          offsetX.value = withDelay(400, withTiming(0, { duration: 0 }));
          offsetY.value = withDelay(400, withTiming(0, { duration: 0 }));
          return;
        }
        offsetX.value = reduceMotion ? 0 : withSpring(0, SETTLE_SPRING);
        offsetY.value = reduceMotion ? 0 : withSpring(0, SETTLE_SPRING);
      })
      .onFinalize(() => {
        if (!drag || !dragging.value) return;
        dragging.value = false;
        lifted.value = reduceMotion ? 0 : withTiming(0, { duration: 160 });
        scheduleOnRN(drag.markDrag);
        drag.hoverLane.value = -1;
        drag.sourceLane.value = -1;
      });
  }, [drag, dragging, enabled, lane, lifted, offsetX, offsetY, reduceMotion, taskId]);

  const style = useAnimatedStyle(() => ({
    zIndex: lifted.value > 0 ? 20 : 0,
    opacity: 1 - lifted.value * 0.08,
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: 1 + lifted.value * 0.03 },
    ],
  }));

  if (!drag) return children;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
