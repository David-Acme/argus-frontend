export type ConfirmVariant = 'default' | 'destructive';

export type ConfirmProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
};
