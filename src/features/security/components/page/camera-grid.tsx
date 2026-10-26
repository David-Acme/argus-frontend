import { clsx } from 'clsx';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Media, type MediaDormant } from '@/shared/ui/media';
import {
  gridColumnsFor,
  rowsOf,
  tileLabel,
  type SecurityTile,
  type TileState,
} from '@/features/security/model/camera-tiles';
import type { MomentFormat } from '@/features/security/model/moment';

export type CameraGridProps = {
  tiles: readonly SecurityTile[];
  frames: ReadonlyMap<string, string>;
  now: number;
  format: MomentFormat;
  fill: boolean;
  onOpen: (cameraId: string) => void;
  onTalk?: (cameraId: string) => void;
};

type TileProps = Omit<CameraGridProps, 'tiles'> & { tile: SecurityTile };

const DORMANT: Readonly<Record<TileState, MediaDormant | undefined>> = {
  live: undefined,
  private: 'privacy',
  off: 'off',
  offline: 'off',
};

function CameraTile({ tile, frames, now, format, fill, onOpen, onTalk }: TileProps) {
  const { t } = useTranslation();
  const frame = frames.get(tile.id);
  const live = tile.state === 'live';
  const reveal = (
    <>
      <Button
        glass
        compact
        label={{
          shown: t('screens.security.camera-grid.see'),
          spoken: t('screens.security.camera-grid.see-label', { name: tile.name }),
        }}
        onPress={() => onOpen(tile.id)}
      />
      {onTalk ? (
        <Button
          glass
          compact
          icon="mic"
          label={{
            shown: t('screens.security.camera-grid.talk'),
            spoken: t('screens.security.camera-grid.talk-label', { name: tile.name }),
          }}
          onPress={() => onTalk(tile.id)}
        />
      ) : null}
    </>
  );
  return (
    <Media
      name={tile.name}
      detail={tileLabel(tile, now, format)}
      live={live ? t('screens.security.camera-grid.live') : undefined}
      dormant={DORMANT[tile.state]}
      frame={frame ? { uri: frame } : undefined}
      fill={fill}
      reveal={fill ? reveal : undefined}
      onPress={() => onOpen(tile.id)}
    />
  );
}

export function CameraGrid({ tiles, fill, ...tile }: CameraGridProps) {
  const [width, setWidth] = useState(0);
  const columns = fill ? gridColumnsFor(tiles.length, width) : 2;
  const measure = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  return (
    <View className="gap-media-grid-gap grow" onLayout={measure}>
      {rowsOf(tiles, columns).map((row, index) => (
        <View key={index} className={clsx('gap-media-grid-gap flex-row', fill && 'flex-1')}>
          {row.map((item, slot) => (
            <View key={item?.id ?? `slot-${slot}`} className="min-w-0 flex-1">
              {item ? <CameraTile tile={item} fill={fill} {...tile} /> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
