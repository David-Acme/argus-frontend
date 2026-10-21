import type { ReactNode, RefObject } from 'react';
import type { FlightAction } from '@/shared/ui/button/use-single-flight';

export const sheetVariants = ['form', 'list', 'detail'] as const;

export type SheetVariant = (typeof sheetVariants)[number];

export type SheetAction = {
  label: string;
  onPress: FlightAction;
  disabled?: boolean;
  busy?: boolean;
};

export type SheetActions = {
  primary: SheetAction;
  more?: SheetAction;
};

export type Focusable = { focus: () => void };

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  variant?: SheetVariant;
  long?: boolean;
  dirty?: string | boolean;
  actions?: SheetActions;
  initialFocus?: RefObject<Focusable | null>;
  children: ReactNode;
  testID?: string;
};
