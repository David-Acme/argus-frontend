import { t } from '@/core/i18n';
import type { IServiceResponse } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { ConfirmRequest } from '@/core/types';
import { TOAST_ACTION_MS } from '@/shared/constants';
import { confirm } from './confirm';
import { optimisticRegistry, type OptimisticIntent, type OptimisticIntentInput } from './optimistic';
import { isRetryableServiceError, toastServiceError } from './service-error';
import { toast } from './toast';

export type OptimisticUndo = {
  title: string;
  description?: string;
};

export type OptimisticAction<R> = {
  intents: readonly OptimisticIntentInput<object>[];
  call: () => Promise<IServiceResponse<R>>;
  confirm?: ConfirmRequest;
  undo?: OptimisticUndo;
  success?: string;
  errorTitle?: string;
  onRefused?: () => void;
};

function sessionOf(userId: number | string | undefined): string | null {
  return userId == null ? null : String(userId);
}

optimisticRegistry.bindSession(sessionOf(useAuthStore.getState().user?.id));
useAuthStore.subscribe((state) => optimisticRegistry.bindSession(sessionOf(state.user?.id)));

export function serverRecordId(info: unknown): string | undefined {
  if (typeof info !== 'object' || info === null || !('id' in info)) return undefined;
  const { id } = info;
  return typeof id === 'number' || typeof id === 'string' ? String(id) : undefined;
}

function waitForUndo(undo: OptimisticUndo): Promise<boolean> {
  return new Promise((resolve) => {
    let undone = false;
    const timer = setTimeout(() => {
      if (!undone) resolve(false);
    }, TOAST_ACTION_MS);
    toast.info(undo.title, undo.description, {
      label: t('common.undo'),
      onPress: () => {
        if (undone) return;
        undone = true;
        clearTimeout(timer);
        resolve(true);
      },
    });
  });
}

function rollback(begun: readonly OptimisticIntent[]): void {
  for (const intent of begun) optimisticRegistry.rollback(intent.id);
}

export async function runOptimistic<R>(action: OptimisticAction<R>): Promise<IServiceResponse<R> | null> {
  if (action.confirm && !(await confirm(action.confirm))) return null;
  const begun = action.intents.map((intent) => optimisticRegistry.begin(intent));
  if (action.undo && (await waitForUndo(action.undo))) {
    rollback(begun);
    return null;
  }
  let result: IServiceResponse<R>;
  try {
    result = await action.call();
  } catch (error) {
    rollback(begun);
    throw error;
  }
  if (!result.ok) {
    rollback(begun);
    action.onRefused?.();
    const retry = isRetryableServiceError(result.errors)
      ? { label: t('common.retry'), onPress: () => void runOptimistic({ ...action, confirm: undefined, undo: undefined }) }
      : undefined;
    toastServiceError(result.errors, action.errorTitle, retry);
    return null;
  }
  const recordId = serverRecordId(result.info);
  for (const intent of begun) optimisticRegistry.confirm(intent.id, recordId);
  if (action.success) toast.success(action.success);
  return result;
}
