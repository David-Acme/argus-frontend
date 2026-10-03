import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { IZoneCacheRow } from '@/core/interfaces';
import { OVERLAY_STROKE_COLOR } from '@/shared/constants';
import { ZONE_COLORS } from '@/features/cameras/constants';

type CameraZonesOverlayProps = {
  zones: readonly IZoneCacheRow[];
};

type Size = { width: number; height: number };

export function CameraZonesOverlay({ zones }: CameraZonesOverlayProps) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  return (
    <View pointerEvents="none" onLayout={onLayout} className="absolute inset-0">
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height}>
          {zones
            .filter((zone) => zone.isEnabled && zone.points.length >= 3)
            .map((zone) => {
              const color = zone.color || ZONE_COLORS[0];
              const points = zone.points
                .map((point) => `${point.x * size.width},${point.y * size.height}`)
                .join(' ');
              return (
                <Polygon
                  key={zone.id}
                  points={points}
                  fill={color}
                  fillOpacity={zone.zoneType === 'exclude' ? 0.08 : 0.18}
                  stroke={zone.zoneType === 'exclude' ? OVERLAY_STROKE_COLOR : color}
                  strokeOpacity={zone.zoneType === 'exclude' ? 0.6 : 1}
                  strokeDasharray={zone.zoneType === 'exclude' ? '6 6' : undefined}
                  strokeWidth={2}
                />
              );
            })}
        </Svg>
      ) : null}
    </View>
  );
}
