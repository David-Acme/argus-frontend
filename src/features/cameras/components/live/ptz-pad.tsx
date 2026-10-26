import { clsx } from 'clsx';
import { View } from 'react-native';
import { usePadPress } from '@/features/cameras/hooks/use-pad-press';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';
import type { PtzDirection } from '@/features/cameras/model/camera-ptz';
import { useTranslation } from '@/shared/hooks/use-translation';
import { illustration, size, useEffects } from '@/shared/theme';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';

export type PtzPadProps = { ptz: CameraPtzControls };

type PadButtonProps = { direction: PtzDirection; ptz: CameraPtzControls };

const GLYPH: Record<PtzDirection, IconGlyph> = {
  up: 'chevu',
  down: 'chevd',
  left: 'chevl',
  right: 'chev',
};

const LABEL = {
  up: 'screens.cameras.ptz-up',
  down: 'screens.cameras.ptz-down',
  left: 'screens.cameras.ptz-left',
  right: 'screens.cameras.ptz-right',
} as const;

const CONTROL = { backgroundColor: illustration.mediaControl };

const SLOP = (size.target - size.mediaControl) / 2;

function PadButton({ direction, ptz }: PadButtonProps) {
  const { t } = useTranslation();
  const { reduceTransparency } = useEffects();
  const press = usePadPress(direction, ptz);
  return (
    <PressableSurface
      a11y={{ label: t(LABEL[direction]), role: 'button' }}
      hold={press}
      pressed={{ scale: 'icon' }}
      hitSlop={SLOP}
      className={clsx(
        'size-media-control items-center justify-center rounded-full',
        !reduceTransparency && 'web:backdrop-blur-media'
      )}
      style={CONTROL}>
      <Icon name={GLYPH[direction]} size="small" tone="on-media" />
    </PressableSurface>
  );
}

export function PtzPad({ ptz }: PtzPadProps) {
  return (
    <View className="left-talk-pad-edge bottom-talk-pad-edge gap-talk-pad-gap absolute items-center">
      <PadButton direction="up" ptz={ptz} />
      <View className="gap-talk-pad-gap flex-row">
        <PadButton direction="left" ptz={ptz} />
        <View className="size-media-control" />
        <PadButton direction="right" ptz={ptz} />
      </View>
      <PadButton direction="down" ptz={ptz} />
    </View>
  );
}
