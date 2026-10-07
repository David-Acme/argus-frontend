import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { CameraFormFactor } from '@/core/types';
import { CameraCard } from '@/features/cameras/components/camera-card';
import { gridColumns, type CameraDensity, type CameraView } from '@/features/cameras/model/camera-overview';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';

type CameraCardGridProps = {
  views: readonly CameraView[];
  density: CameraDensity;
  now: number;
  formFactorOf: (camera: ICameraCacheRow) => CameraFormFactor;
  canTalkOf: (camera: ICameraCacheRow) => boolean;
  badgeOf?: (camera: ICameraCacheRow) => ReactNode;
  isPending?: (camera: ICameraCacheRow) => boolean;
  thumbnails?: ReadonlyMap<string, string>;
  livePreviews?: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onTalk: (id: string) => void;
};

const FEATURED_MIN_WIDTH = 900;

export function CameraCardGrid({
  views,
  density,
  now,
  formFactorOf,
  canTalkOf,
  badgeOf,
  isPending,
  thumbnails,
  livePreviews,
  onSelect,
  onTalk,
}: CameraCardGridProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const card = (view: CameraView, variant: 'grid' | 'featured' | 'row') => (
    <CameraCard
      view={view}
      variant={variant}
      formFactor={formFactorOf(view.camera)}
      canTalk={canTalkOf(view.camera)}
      now={now}
      pending={isPending?.(view.camera) ?? false}
      thumbnail={thumbnails?.get(view.camera.id)}
      livePreview={variant !== 'row' && (livePreviews?.has(view.camera.id) ?? false)}
      badge={badgeOf?.(view.camera)}
      onPress={onSelect}
      onTalk={onTalk}
    />
  );

  if (density === 'list') {
    return (
      <View className="gap-2.5">
        {views.map((view) => (
          <View key={view.camera.id}>{card(view, 'row')}</View>
        ))}
      </View>
    );
  }

  const [only] = views;
  if (views.length === 1 && only && width >= FEATURED_MIN_WIDTH) {
    return <View onLayout={onLayout}>{card(only, 'featured')}</View>;
  }

  return (
    <View onLayout={onLayout}>
      <ResponsiveGrid
        id="cameras"
        items={views}
        keyOf={(view) => view.camera.id}
        renderItem={(view) => card(view, 'grid')}
        columnsFor={gridColumns}
        gap={16}
      />
    </View>
  );
}
