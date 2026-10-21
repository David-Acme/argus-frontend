import { clsx } from 'clsx';
import { useId } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { auraField, useEffects, useThemeTokens, type AuraTone } from '@/shared/theme';
import { AuraBlobView } from './aura-blob';
import { useIncreaseContrast } from './use-increase-contrast';

export type AuraMode = 'field' | 'band' | 'edge';

export type AuraProps = {
  tone: AuraTone;
  mode?: AuraMode;
  height?: number;
  paused?: boolean;
};

type Look = { still: boolean; faded: boolean; contrast: boolean };

type EdgeProps = { look: Look };

const HIDDEN = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

const PULSE = {
  animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
  animationDuration: `${auraField.edgeSeconds / 2}s`,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as const;

type Drift = { blob: (typeof auraField.blobs)[number]; seconds: number; paused: boolean };

function driftOf({ blob, seconds, paused }: Drift) {
  return {
    animationName: {
      from: { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] },
      to: { transform: [{ translateX: blob.x }, { translateY: blob.y }, { scale: blob.scale }] },
    },
    animationDuration: `${seconds}s`,
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in-out',
    animationPlayState: paused ? 'paused' : 'running',
  } as const;
}

function useLook(): Look {
  const { reduceMotion, reduceTransparency, perfTier } = useEffects();
  const contrast = useIncreaseContrast();
  return { still: reduceMotion || perfTier === 'low', faded: reduceTransparency, contrast };
}

function Fade() {
  const { color } = useThemeTokens();
  const id = `aura-fade-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View className="absolute inset-0">
      <Svg width="100%" height="100%">
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={auraField.fadeStart} stopColor={color.bg} stopOpacity={0} />
          <Stop offset={1} stopColor={color.bg} stopOpacity={1} />
        </LinearGradient>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function Edge({ look }: EdgeProps) {
  const { elevation } = useThemeTokens();
  const rim = { boxShadow: look.contrast ? elevation.listenContrast : elevation.listen };
  const peak = { ...PULSE, boxShadow: elevation.listenPeak };
  return (
    <View {...HIDDEN} className="pointer-events-none absolute inset-0" style={rim}>
      {look.still || look.contrast ? null : (
        <Animated.View className="absolute inset-0" style={peak} />
      )}
    </View>
  );
}

export function Aura({
  tone,
  mode = 'field',
  height = auraField.height,
  paused = false,
}: AuraProps) {
  const look = useLook();
  const { aura } = useThemeTokens();
  if (mode === 'edge') return <Edge look={look} />;
  if (look.contrast) return null;
  const fills = aura[tone];
  const opacity = look.faded ? auraField.reducedOpacity * auraField.opacity : auraField.opacity;
  const frame = mode === 'field' ? { height, opacity } : { opacity };
  return (
    <View
      {...HIDDEN}
      className={clsx(
        'pointer-events-none absolute overflow-hidden',
        mode === 'field' ? 'inset-x-0 top-0' : 'inset-0'
      )}
      style={frame}>
      {auraField.blobs.map((blob, index) => (
        <AuraBlobView
          key={blob.top}
          blob={blob}
          index={index}
          fill={fills[index] ?? fills[0]}
          drift={
            look.still
              ? null
              : driftOf({
                  blob,
                  seconds: tone === 'alert' ? blob.alertSeconds : blob.seconds,
                  paused,
                })
          }
        />
      ))}
      {mode === 'field' ? <Fade /> : null}
    </View>
  );
}
