import { t } from '@/core/i18n';
import type { IApiError } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { toast } from './toast';

const ERROR_KEYS: Readonly<Record<string, TranslationKey>> = {
  NETWORK_ERROR: 'common.errors.network',
  TIMEOUT: 'common.errors.timeout',
  DEADLINE_EXCEEDED: 'common.errors.timeout',
  UNAUTHORIZED: 'common.errors.unauthorized',
  FORBIDDEN: 'common.errors.forbidden',
  NOT_FOUND: 'common.errors.not-found',
  USER_NOT_FOUND: 'common.errors.not-found',
  CONFLICT: 'common.errors.conflict',
  VALIDATION_ERROR: 'common.errors.validation',
  BAD_REQUEST: 'common.errors.bad-request',
  TOO_MANY_REQUESTS: 'common.errors.too-many-requests',
  SERVICE_UNAVAILABLE: 'common.errors.unavailable',
  BAD_GATEWAY: 'common.errors.unavailable',
  INTERNAL_ERROR: 'common.errors.server-error',
  CAMERA_UNREACHABLE: 'common.errors.camera-unreachable',
  REMOTE_NOT_ALLOWED: 'common.errors.remote-not-allowed',
  PAIRING_REQUIRED: 'common.errors.pairing-required',
};

export function serviceErrorKey(error: IApiError | null | undefined): TranslationKey {
  return (error && ERROR_KEYS[error.code]) ?? 'common.errors.unknown';
}

export function toastServiceError(error: IApiError | null | undefined, title?: string): void {
  const message = t(serviceErrorKey(error));
  if (title) toast.error(title, message);
  else toast.error(message);
}
