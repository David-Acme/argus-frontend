export type ToastIntent = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  intent: ToastIntent;
  title: string;
  description?: string;
};
