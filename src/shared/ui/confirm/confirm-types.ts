import type { FlightAction } from '@/shared/ui/button';

export type ConfirmVariant = 'default' | 'destructive';

export type ConfirmProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  variant?: ConfirmVariant;
  onConfirm: FlightAction;
  onCancel: () => void;
};
