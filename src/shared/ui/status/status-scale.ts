import { size, stageStepOf, type HeightLayout } from '@/shared/theme';
import type { TextVariant } from '@/shared/ui/text';
import type { HeroScale } from './status-types';

export type HeroStep = { variant: TextVariant; presence: number };

export type HeroStepInput = { scale?: HeroScale; wide: boolean; height: HeightLayout };

const PRESENCE_SIZE: Record<HeroScale | 'page', number> = {
  page: size.presenceHero,
  dense: size.presenceHeroDense,
  secondary: size.presenceHeroSmall,
};

export function heroStepOf({ scale, wide, height }: HeroStepInput): HeroStep {
  if (height.landscape) return { variant: 'heroSecondary', presence: size.presenceHeroLandscape };
  if (stageStepOf(height) !== 'regular')
    return { variant: 'heroSecondary', presence: size.presenceHeroSmall };
  if (wide) return { variant: 'hero', presence: PRESENCE_SIZE[scale ?? 'page'] };
  return {
    variant: scale === 'secondary' ? 'heroSecondary' : 'heroCompact',
    presence: PRESENCE_SIZE[scale ?? 'page'],
  };
}
