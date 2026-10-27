import type { IconGlyph } from '@/shared/ui/icon';

const GLYPHS: Readonly<Record<string, IconGlyph>> = {
  surveillance: 'shield',
  productivity: 'cal',
};

export const moduleGlyphOf = (id: string): IconGlyph => GLYPHS[id] ?? 'grid';
