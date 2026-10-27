import { heightLayoutOf, size, space, windowClassOf } from '@/shared/theme';
import type { HeightClass } from '@/shared/theme';

export type OnboardingWindow = { width: number; height: number };

export type OnboardingLayout = {
  card: boolean;
  hero: number;
  finder: number;
  top: number;
};

const HERO: Readonly<Record<HeightClass, number>> = {
  regular: size.presenceWelcome,
  short: size.presenceWelcomeShort,
  tiny: size.presenceWelcomeTiny,
};

const FINDER: Readonly<Record<HeightClass, number>> = {
  regular: size.finder,
  short: size.finderShort,
  tiny: size.finderTiny,
};

const TOP: Readonly<Record<HeightClass, number>> = {
  regular: space[6],
  short: space[3],
  tiny: space[2],
};

export function onboardingLayoutOf(window: OnboardingWindow): OnboardingLayout {
  const { heightClass, landscape } = heightLayoutOf(window);
  const card = windowClassOf(window.width) !== 'compact' && !landscape;
  if (card) return { card, hero: HERO.regular, finder: FINDER.regular, top: 0 };
  if (landscape) return { card, hero: HERO.tiny, finder: size.finderLandscape, top: TOP.tiny };
  return { card, hero: HERO[heightClass], finder: FINDER[heightClass], top: TOP[heightClass] };
}
