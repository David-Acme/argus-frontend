import { t } from '@/core/i18n';
import type { IServiceResponse } from '@/core/interfaces';
import { newIdempotencyKey } from '@/core/services/http';
import { useAuthStore } from '@/core/stores';
import type { ConfirmRequest, TranslationKey } from '@/core/types';
import { TOAST_ACTION_MS } from '@/shared/constants';
import { confirm } from './confirm';
import {
  optimisticRegistry,
  type OptimisticIntent,
  type OptimisticIntentInput,
} from './optimistic';
import { isRetryableServiceError, toastServiceError } from './service-error';
import { toast } from './toast';

export type OptimisticUndo = {
  title: string;
  description?: string;
};

export type OptimisticRefusal = {
  recordIds: readonly string[];
  title: string;
  description?: string;
};

export type OptimisticNotice = {
  title: string;
  description?: string;
};

export type OptimisticAction<R> = {
  intents: readonly OptimisticIntentInput<object>[];
  call: (idempotencyKey: string) => Promise<IServiceResponse<R>>;
  idempotencyKey?: string;
  confirm?: ConfirmRequest;
  undo?: OptimisticUndo;
  success?: string;
  errorTitle?: string;
  onRefused?: () => void;
  refusals?: (info: R) => OptimisticRefusal | null;
  refusalNotice?: (result: IServiceResponse<R>) => OptimisticNotice | null;
};

const CHANGE_TITLES: Readonly<Partial<Record<string, TranslationKey>>> = {
  reminder: 'common.change-failed.reminder',
  calendar_event: 'common.change-failed.calendar-event',
  calendar_event_share: 'common.change-failed.calendar-event-share',
  camera: 'common.change-failed.camera',
  zone: 'common.change-failed.zone',
  conversation_message: 'common.change-failed.conversation-message',
  notification: 'common.change-failed.notification',
  project: 'common.change-failed.project',
  project_member: 'common.change-failed.project-member',
  project_task: 'common.change-failed.project-task',
  session: 'common.change-failed.session',
  user: 'common.change-failed.user',
  user_invitation: 'common.change-failed.user-invitation',
};

export function changeTitleKey(intents: readonly Pick<OptimisticIntentInput<object>, 'table'>[]): TranslationKey {
  const table = intents[0]?.table;
  return (table && CHANGE_TITLES[table]) || 'common.change-failed.generic';
}

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

export async function runOptimistic<R>(
  action: OptimisticAction<R>
): Promise<IServiceResponse<R> | null> {
  if (action.confirm && !(await confirm(action.confirm))) return null;
  const idempotencyKey = action.idempotencyKey ?? newIdempotencyKey();
  const begun = action.intents.map((intent) => optimisticRegistry.begin(intent));
  if (action.undo && (await waitForUndo(action.undo))) {
    rollback(begun);
    return null;
  }
  let result: IServiceResponse<R>;
  try {
    result = await action.call(idempotencyKey);
  } catch (error) {
    rollback(begun);
    throw error;
  }
  if (!result.ok) {
    rollback(begun);
    action.onRefused?.();
    const notice = action.refusalNotice?.(result) ?? null;
    if (notice) {
      toast.info(notice.title, notice.description);
      return null;
    }
    const retry = isRetryableServiceError(result.errors)
      ? {
          label: t('common.retry'),
          onPress: () =>
            void runOptimistic({ ...action, idempotencyKey, confirm: undefined, undo: undefined }),
        }
      : undefined;
    toastServiceError(result.errors, action.errorTitle ?? t(changeTitleKey(action.intents)), retry);
    return null;
  }
  const recordId = serverRecordId(result.info);
  const refusal = result.info != null && action.refusals ? action.refusals(result.info) : null;
  const refused = new Set(refusal?.recordIds ?? []);
  for (const intent of begun) {
    if (refused.has(intent.recordId)) optimisticRegistry.rollback(intent.id);
    else optimisticRegistry.confirm(intent.id, recordId);
  }
  if (refusal && refused.size > 0) toast.error(refusal.title, refusal.description);
  else if (action.success) toast.success(action.success);
  return result;
}
