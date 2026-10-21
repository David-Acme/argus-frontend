import type { IconGlyph } from '@/shared/ui/icon';

export type ChoiceOption<T extends string> = { value: T; label: string; icon?: IconGlyph };
