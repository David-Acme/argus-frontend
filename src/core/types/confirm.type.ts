export type ConfirmIntent = 'danger' | 'warning' | 'info';

export type ConfirmRequest = {
  title: string;
  description?: string;
  /** Label of the accepting button; defaults to a generic confirm. */
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
};
