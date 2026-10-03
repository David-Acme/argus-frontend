export type ConfirmIntent = 'danger' | 'warning' | 'info';

export type ConfirmRequest = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
};
