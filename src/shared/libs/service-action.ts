import type { IServiceResponse } from '@/core/interfaces';
import type { ConfirmRequest } from '@/core/types';
import { confirm } from './confirm';
import { toastServiceError } from './service-error';
import { toast } from './toast';

export type ServiceAction<R> = {
  confirm?: ConfirmRequest;
  call: () => Promise<IServiceResponse<R>>;
  success?: string;
  errorTitle?: string;
};

export async function runServiceAction<R>(action: ServiceAction<R>): Promise<IServiceResponse<R> | null> {
  if (action.confirm && !(await confirm(action.confirm))) return null;
  const result = await action.call();
  if (!result.ok) {
    toastServiceError(result.errors, action.errorTitle);
    return null;
  }
  if (action.success) toast.success(action.success);
  return result;
}
