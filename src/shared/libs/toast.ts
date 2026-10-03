import { useToastStore } from '@/core/stores';
import type { ToastAction } from '@/core/types';

export const toast = {
  success: (title: string, description?: string, action?: ToastAction) =>
    useToastStore.getState().show('success', title, description, action),
  error: (title: string, description?: string, action?: ToastAction) =>
    useToastStore.getState().show('error', title, description, action),
  warning: (title: string, description?: string, action?: ToastAction) =>
    useToastStore.getState().show('warning', title, description, action),
  info: (title: string, description?: string, action?: ToastAction) =>
    useToastStore.getState().show('info', title, description, action),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};

export type Toast = typeof toast;
