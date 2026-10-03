import { useToastStore } from '@/core/stores';

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().show('success', title, description),
  error: (title: string, description?: string) =>
    useToastStore.getState().show('error', title, description),
  warning: (title: string, description?: string) =>
    useToastStore.getState().show('warning', title, description),
  info: (title: string, description?: string) =>
    useToastStore.getState().show('info', title, description),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};

export type Toast = typeof toast;
