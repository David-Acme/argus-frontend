export type RevealPlatform = 'web' | 'native';

export type RevealStyleInput = {
  blur: boolean;
  scale: boolean;
  platform: RevealPlatform;
  progress: number;
  reduceMotion: boolean;
};

export type RevealStyle = {
  opacity: number;
  transform?: { translateY: number }[] | { scale: number }[];
  filter?: { blur: string }[];
};

export const BLUR_INITIAL_PX = 14;

export const REVEAL_LIFT_PX = 8;

export function revealStyle({
  blur,
  scale,
  platform,
  progress,
  reduceMotion,
}: RevealStyleInput): RevealStyle {
  'worklet';
  if (reduceMotion) return { opacity: progress };
  const remaining = 1 - progress;
  const scaleTransform = scale ? [{ scale: 0.96 + 0.04 * progress }] : [];
  if (!blur) {
    return { opacity: progress, ...(scale ? { transform: scaleTransform } : {}) };
  }
  if (platform === 'web') {
    return {
      opacity: progress,
      ...(scale ? { transform: scaleTransform } : {}),
      filter: [{ blur: `${(remaining * BLUR_INITIAL_PX).toFixed(1)}px` }],
    };
  }
  if (scale) return { opacity: progress, transform: scaleTransform };
  return { opacity: progress, transform: [{ translateY: remaining * REVEAL_LIFT_PX }] };
}
