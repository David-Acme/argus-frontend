export type ToastIntent = 'success' | 'error' | 'warning' | 'info';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastItem = {
  id: string;
  intent: ToastIntent;
  title: string;
  description?: string;
  action?: ToastAction;
};
