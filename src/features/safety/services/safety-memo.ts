import type { IServiceResponse } from '@/core/interfaces';
import { resourceSignal } from '@/core/services/sync/resource-signal';
import type { ResourceNotice, SafetyStatus } from '@/core/types';

const PIN_SCOPES: readonly string[] = ['safety_pin', 'duress'];

export function forgetsPinMemo(notice: ResourceNotice): boolean {
  return notice.domain === 'guard' && PIN_SCOPES.includes(notice.scope);
}

export function needsPin(
  known: SafetyStatus | null,
  answer: IServiceResponse<SafetyStatus> | null
): boolean {
  if (known) return known.hasPin;
  if (answer == null || !answer.ok || answer.info == null) return true;
  return answer.info.hasPin;
}

export function bindSafetyMemo(
  signal: Pick<typeof resourceSignal, 'onChanged' | 'onReconnected'>,
  target: { forget(): void }
): void {
  signal.onChanged((notice) => {
    if (forgetsPinMemo(notice)) target.forget();
  });
  signal.onReconnected(() => target.forget());
}

export function watchSafetyMemo(target: { forget(): void }): void {
  bindSafetyMemo(resourceSignal, target);
}
