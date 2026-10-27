import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useCameraSection } from '@/features/home/hooks/use-camera-section';
import {
  gridColumns,
  gridRows,
  tileDetail,
  type CameraTile,
} from '@/features/home/model/camera-tiles';
import { useTranslation } from '@/shared/hooks/use-translation';
import { layout } from '@/shared/theme';
import { MediaStrip } from '@/shared/ui/media';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { CameraMedia } from './camera-media';

type CameraGridProps = {
  tiles: readonly CameraTile[];
  render: (tile: CameraTile) => ReactNode;
  onWidth: (width: number) => void;
};

function CameraGrid({ tiles, render, onWidth }: CameraGridProps) {
  const measure = (event: LayoutChangeEvent) => onWidth(event.nativeEvent.layout.width);
  return (
    <View className="gap-media-grid-gap grow" onLayout={measure}>
      {gridRows(tiles, gridColumns(tiles.length)).map((row, index) => (
        <View key={index} className="gap-media-grid-gap flex-1 flex-row">
          {row.map((tile, slot) => (
            <View key={tile?.id ?? `slot-${slot}`} className="flex-1">
              {tile ? render(tile) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function CamerasSection() {
  const column = useInScreenColumn();
  const [wide, setWide] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const section = useCameraSection({ grid: column, wide });
  const open = (cameraId: string) => router.push(`/cameras/${cameraId}`);
  const openSecurity = () => router.push('/security');
  const media = (tile: CameraTile) => (
    <CameraMedia
      key={tile.id}
      tile={tile}
      detail={tileDetail(tile, { now: section.now, format: section.format })}
      frame={section.frames.get(tile.id)}
      order={section.tiles.indexOf(tile)}
      fill={column}
      onOpen={open}
    />
  );
  if (!section.visible) return null;
  return (
    <Section
      title={t('screens.home.camera-sections.cameras')}
      action={{
        label: t('screens.home.camera-sections.security'),
        onPress: openSecurity,
      }}
      variant="plain">
      {column ? (
        <CameraGrid
          tiles={section.tiles}
          render={media}
          onWidth={(width) => setWide(width >= layout.mediaGridWide)}
        />
      ) : (
        <MediaStrip label={t('screens.home.camera-sections.strip')}>
          {section.tiles.map(media)}
        </MediaStrip>
      )}
    </Section>
  );
}
