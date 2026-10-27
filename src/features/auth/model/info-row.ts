import type { TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export type InfoRow = {
  key: string;
  icon: IconGlyph;
  title: TranslationKey;
  meta: TranslationKey;
  done?: boolean;
};
