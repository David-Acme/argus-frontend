import { useCallback, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import type { ZonePoint } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { OVERLAY_STROKE_COLOR } from '@/shared/constants';
import { ZONE_MAX_POINTS, ZONE_MIN_POINTS } from '@/features/cameras/constants';

type ZoneEditorProps = {
  points: ZonePoint[];
  onChange: (points: ZonePoint[]) => void;
  color: string;
  hint: string;
  aspectRatio?: number;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function ZoneEditor({
  points,
  onChange,
  color,
  hint,
  aspectRatio = 16 / 9,
}: ZoneEditorProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const addPoint = useCallback(
    (x: number, y: number) => {
      if (size.width === 0 || size.height === 0 || points.length >= ZONE_MAX_POINTS) return;
      onChange([...points, { x: clamp(x / size.width), y: clamp(y / size.height) }]);
    },
    [onChange, points, size.height, size.width]
  );

  const tap = useMemo(
    () => Gesture.Tap().onEnd((event) => addPoint(event.x, event.y)).runOnJS(true),
    [addPoint]
  );

  const pixels = useMemo(
    () => points.map((point) => ({ x: point.x * size.width, y: point.y * size.height })),
    [points, size.height, size.width]
  );

  const polygon = pixels.map((point) => `${point.x},${point.y}`).join(' ');
  const enough = points.length >= ZONE_MIN_POINTS;

  return (
    <View className="gap-2">
      <GestureDetector gesture={tap}>
        <View
          onLayout={onLayout}
          style={{ aspectRatio }}
          className="bg-surface-secondary border-border-subtle w-full overflow-hidden rounded-2xl border">
          {size.width > 0 ? (
            <Svg width="100%" height="100%">
              {enough ? (
                <Polygon points={polygon} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
              ) : (
                pixels.slice(1).map((point, index) => (
                  <Line
                    key={`edge-${index}`}
                    x1={pixels[index].x}
                    y1={pixels[index].y}
                    x2={point.x}
                    y2={point.y}
                    stroke={color}
                    strokeWidth={2}
                  />
                ))
              )}
              {pixels.map((point, index) => (
                <Circle
                  key={`handle-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={7}
                  fill={color}
                  stroke={OVERLAY_STROKE_COLOR}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
      <Text variant="caption">{hint}</Text>
    </View>
  );
}
