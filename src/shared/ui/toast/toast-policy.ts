import type { FeedbackKind } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';
import type { ToastKind } from './toast-card';

export type ToastInput =
  | { kind: 'info' | 'success'; title: string }
  | { kind: 'undo'; title: string; onUndo: () => void }
  | { kind: 'error'; title: string; body?: string; icon?: IconGlyph; onRetry?: () => void };

export type ToastPlan = {
  id: string | undefined;
  duration: number;
  haptic: FeedbackKind | undefined;
  action: (() => void) | undefined;
};

const DURATION: Record<ToastKind, number> = {
  info: 4000,
  success: 4000,
  undo: 5000,
  error: 8000,
};

const HAPTIC: Partial<Record<ToastKind, FeedbackKind>> = {
  success: 'success',
  error: 'warning',
};

export const ERROR_TOAST_ID = 'argus-error';

function actionOf(input: ToastInput): (() => void) | undefined {
  if (input.kind === 'undo') return input.onUndo;
  if (input.kind === 'error') return input.onRetry;
  return undefined;
}

export function planToast(input: ToastInput): ToastPlan {
  return {
    id: input.kind === 'error' ? ERROR_TOAST_ID : undefined,
    duration: DURATION[input.kind],
    haptic: HAPTIC[input.kind],
    action: actionOf(input),
  };
}

export function cardPropsOf(input: ToastInput) {
  if (input.kind === 'error') {
    return { kind: input.kind, title: input.title, body: input.body, icon: input.icon };
  }
  return { kind: input.kind, title: input.title };
}
