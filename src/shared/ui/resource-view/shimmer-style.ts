import { motion } from '@/shared/theme';

const SHIMMER_STILL = { opacity: motion.loop.shimmerRest };

const SHIMMER = {
  ...SHIMMER_STILL,
  animationName: {
    '0%': SHIMMER_STILL,
    '25%': { opacity: 1 },
    '75%': { opacity: 0 },
    '100%': SHIMMER_STILL,
  },
  animationDuration: motion.loop.shimmer,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
} as const;

export function cssShimmer(reduceMotion: boolean) {
  return reduceMotion ? SHIMMER_STILL : SHIMMER;
}
