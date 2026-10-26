import type { HeightClass } from '@/shared/theme';

export type HeroLook = {
  portrait: 'portrait' | 'large';
  name: 'heroCompact' | 'heroSecondary';
  inlineWhere: boolean;
  facts: boolean;
  compact: boolean;
};

const REGULAR: HeroLook = {
  portrait: 'portrait',
  name: 'heroCompact',
  inlineWhere: false,
  facts: true,
  compact: false,
};

export function heroLookOf(height: HeightClass, panes: boolean): HeroLook {
  if (panes || height === 'regular') return REGULAR;
  return {
    portrait: 'large',
    name: 'heroSecondary',
    inlineWhere: true,
    facts: height === 'short',
    compact: true,
  };
}
