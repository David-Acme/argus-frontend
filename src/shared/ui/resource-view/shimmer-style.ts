import { motion } from '@/shared/theme';

export const SHIMMER_STILL = { opacity: motion.loop.shimmerRest };

export const SHIMMER = {
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
