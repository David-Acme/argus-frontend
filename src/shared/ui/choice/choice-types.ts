import type { ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

export type ChoiceOption<T extends string> = { value: T; label: string; icon?: IconGlyph };

export type ChoiceSheetProps = {
  variant: 'list';
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export type ChoiceSheet = (props: ChoiceSheetProps) => ReactNode;
