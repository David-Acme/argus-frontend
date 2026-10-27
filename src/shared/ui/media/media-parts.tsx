import { clsx } from 'clsx';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useScreenActive } from '@/shared/hooks/use-screen-active';
import { illustration, motion, size, useEffects, useWindowLayout } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import type { IconGlyph } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type MediaDormant = 'off' | 'privacy';

export type MediaControl = { icon: IconGlyph; label: string; onPress: () => void };

export type MediaEye = { label: string };

type LabelRowProps = { name?: string; detail?: string; dormant?: MediaDormant };

type LiveChipProps = { label: string };

type ControlsProps = { controls: readonly MediaControl[] };

type EyeCornerProps = { eye: MediaEye; compact?: boolean };

type DormantMarkProps = { dormant: MediaDormant };

const LIVE_DOT = { backgroundColor: illustration.liveDot };

const BREATHING = {
  animationName: { '50%': { opacity: motion.loop.liveDim } },
  animationDuration: motion.loop.live,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
} as const;

const ASLEEP = { animationPlayState: 'paused' } as const;

const CHIP = { backgroundColor: illustration.mediaChip };

const CONTROL = { backgroundColor: illustration.mediaControl };

const EYE = { backgroundColor: illustration.eyeChip };

const CONTROL_SLOP = (size.target - size.mediaControl) / 2;

const DORMANT_GLYPH: Record<MediaDormant, IconGlyph> = { off: 'eyeoff', privacy: 'lock' };

function useBlur(): string | false {
  const { reduceTransparency } = useEffects();
  return !reduceTransparency && 'web:backdrop-blur-media';
}

export function LabelRow({ name, detail, dormant }: LabelRowProps) {
  if (!name && !detail) return null;
  const tone = dormant ? '2' : 'on-media';
  return (
    <View className="left-media-label-x right-media-label-x bottom-media-label-bottom absolute flex-row items-center justify-between">
      <View className="min-w-0 shrink">
        <Text variant="mediaLabel" tone={tone} numberOfLines={1}>
          {name ?? ''}
        </Text>
      </View>
      {detail ? (
        <View className={dormant ? undefined : 'opacity-85'}>
          <Text variant={dormant ? 'mediaLabel' : 'mediaDetail'} tone={tone} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function LiveChip({ label }: LiveChipProps) {
  const { reduceMotion } = useEffects();
  const active = useScreenActive();
  const blur = useBlur();
  return (
    <View
      className={clsx(
        'left-media-chip top-media-chip gap-media-chip-gap pl-media-chip-start pr-media-chip-end py-media-chip-y absolute flex-row items-center rounded-full',
        blur
      )}
      style={CHIP}>
      <Animated.View
        className="size-dot rounded-full"
        style={reduceMotion ? LIVE_DOT : [LIVE_DOT, BREATHING, active ? null : ASLEEP]}
      />
      <Text variant="mediaChip" tone="on-media">
        {label}
      </Text>
    </View>
  );
}

export function DormantMark({ dormant }: DormantMarkProps) {
  return (
    <View className="absolute inset-0 items-center justify-center">
      <Icon name={DORMANT_GLYPH[dormant]} tone="text-2" />
    </View>
  );
}

export function Controls({ controls }: ControlsProps) {
  const blur = useBlur();
  return (
    <View className="right-overlay-edge bottom-overlay-edge gap-overlay-gap absolute flex-row">
      {controls.map((control) => (
        <PressableSurface
          key={control.label}
          a11y={{ label: control.label, role: 'button' }}
          onPress={control.onPress}
          pressed={{ scale: 'icon' }}
          hitSlop={CONTROL_SLOP}
          className={clsx('size-media-control items-center justify-center rounded-full', blur)}
          style={CONTROL}>
          <Icon name={control.icon} size="small" tone="on-media" />
        </PressableSurface>
      ))}
    </View>
  );
}

export function EyeCorner({ eye, compact = false }: EyeCornerProps) {
  const blur = useBlur();
  const { windowClass } = useWindowLayout();
  const wide = windowClass === 'compact' ? size.presenceEye : size.presenceEyeWide;
  const mark = compact ? size.presenceEyeTile : wide;
  return (
    <View
      role="status"
      className={clsx(
        'right-eye-edge top-eye-edge gap-eye-gap rounded-toast pl-eye-start pr-eye-end py-eye-y absolute flex-row items-center',
        blur
      )}
      style={EYE}>
      <Presence state="look" size={mark} dark />
      <Text variant="eyeChip" tone="on-media">
        {eye.label}
      </Text>
    </View>
  );
}
