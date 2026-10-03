import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import { itemIn } from '@/shared/libs/animations';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { colorTokens } from '@/shared/constants';
import { FACE_OVAL_RATIO } from '@/features/auth/constants/face';
import type { FaceGuideState, IconName, TranslationKey } from '@/core/types';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, Mask, Rect } from 'react-native-svg';
import { useUniwind } from 'uniwind';

type GuideMeta = {
  icon: IconName;
  label: TranslationKey;
  tone: 'neutral' | 'success' | 'warn';
};

const GUIDE_META: Record<FaceGuideState, GuideMeta> = {
  'no-face': { icon: 'scan-face', label: 'screens.face.guide.no-face', tone: 'neutral' },
  'multiple-faces': { icon: 'user', label: 'screens.face.guide.multiple-faces', tone: 'warn' },
  'too-far': { icon: 'chevron-up', label: 'screens.face.guide.too-far', tone: 'neutral' },
  'too-close': { icon: 'chevron-down', label: 'screens.face.guide.too-close', tone: 'neutral' },
  'off-center': { icon: 'chevron-right', label: 'screens.face.guide.off-center', tone: 'neutral' },
  tilted: { icon: 'scan-face', label: 'screens.face.guide.tilted', tone: 'warn' },
  'eyes-closed': { icon: 'eye', label: 'screens.face.guide.eyes-closed', tone: 'warn' },
  'low-light': { icon: 'flashlight', label: 'screens.face.guide.low-light', tone: 'warn' },
  ready: { icon: 'check-circle', label: 'screens.face.guide.ready', tone: 'success' },
};

const TONE_CLASS = {
  neutral: {
    pill: 'bg-surface-secondary/90',
    icon: 'text-accent-strong',
    text: 'text-foreground',
  },
  warn: {
    pill: 'bg-surface-secondary/90',
    icon: 'text-error-strong',
    text: 'text-foreground',
  },
  success: {
    pill: 'bg-surface-secondary/90',
    icon: 'text-success',
    text: 'text-foreground',
  },
} as const;

const PILL_RESERVE = 56;

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type FaceGuideOverlayProps = {
  state: FaceGuideState | null;
  offset: { dx: number; dy: number };
  available: boolean;
  area: { top: number; height: number };
};

export function FaceGuideOverlay({ state, offset, available, area }: FaceGuideOverlayProps) {
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);
  const tokens = colorTokens[theme === 'dark' ? 'dark' : 'light'];

  const areaTop = Math.max(area.top, 0);
  const areaH = Math.max(area.height, 120);
  const ovalW = Math.min(width * 0.8, areaH * 0.8 * FACE_OVAL_RATIO);
  const ovalH = Math.min(ovalW / FACE_OVAL_RATIO, areaH * 0.8);
  const cx = width / 2;
  const cy = areaTop + areaH * 0.46;
  const isReady = state === 'ready';

  const pillTop = Math.min(cy + ovalH / 2 + 16, areaTop + areaH - PILL_RESERVE);
  const arrowTop = Math.max(cy - ovalH / 2 - 56, areaTop + 8);

  useEffect(() => {
    if (isReady && !reduceMotion) {
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 620 }), -1, true);
    } else {
      pulse.value = 0;
    }
  }, [isReady, reduceMotion, pulse]);

  const ellipseProps = useAnimatedProps(() => ({
    strokeOpacity: isReady ? 0.55 + 0.45 * pulse.value : 0.9,
    strokeWidth: isReady ? 3 + 2.5 * pulse.value : 2.5,
  }));

  const dx = offset.dx;
  const dy = offset.dy;
  const arrowIcon: IconName =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? 'chevron-left'
        : 'chevron-right'
      : dy > 0
        ? 'chevron-up'
        : 'chevron-down';

  const meta = state ? GUIDE_META[state] : null;
  const tone = meta ? TONE_CLASS[meta.tone] : TONE_CLASS.neutral;
  const stroke = isReady ? tokens.success : tokens.accent;

  if (!available) return null;

  return (
    <View className="absolute inset-0" pointerEvents="none">
      <Svg width={width} height={height}>
        <Mask id="face-guide-mask">
          <Rect width={width} height={height} fill="white" />
          <Ellipse cx={cx} cy={cy} rx={ovalW / 2} ry={ovalH / 2} fill="black" />
        </Mask>
        <Rect width={width} height={height} fill="rgba(10,10,10,0.55)" mask="url(#face-guide-mask)" />
        <AnimatedEllipse
          cx={cx}
          cy={cy}
          rx={ovalW / 2}
          ry={ovalH / 2}
          fill="none"
          stroke={stroke}
          animatedProps={ellipseProps}
        />
      </Svg>

      {state !== 'off-center' ? null : (
        <View className="absolute items-center" style={{ top: arrowTop, left: cx - 24, width: 48 }}>
          <NativeOnlyAnimatedView entering={itemIn.delay(0)} className="items-center">
            <Icon name={arrowIcon} className="text-accent-strong size-8" />
          </NativeOnlyAnimatedView>
        </View>
      )}

      {state && meta ? (
        <NativeOnlyAnimatedView
          entering={itemIn.delay(0)}
          key={state}
          className="absolute items-center"
          style={{ top: pillTop, left: 0, right: 0 }}>
          <View
            className={`flex-row items-center gap-2.5 rounded-full px-4 py-2.5 ${tone.pill}`}
            accessibilityLiveRegion="polite"
            accessibilityRole="text">
            <Icon name={state === 'off-center' ? arrowIcon : meta.icon} className={`size-5 ${tone.icon}`} />
            <Text variant="body" className={tone.text} maxFontSizeMultiplier={1.25}>
              {t(meta.label)}
            </Text>
          </View>
        </NativeOnlyAnimatedView>
      ) : null}
    </View>
  );
}
