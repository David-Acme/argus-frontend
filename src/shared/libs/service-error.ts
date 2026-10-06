import { t } from '@/core/i18n';
import type { IApiError } from '@/core/interfaces';
import type { ToastAction, TranslationKey } from '@/core/types';
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
  CAMERA_SECRET_NOT_SEALED: 'common.errors.camera-secret',
  REMOTE_NOT_ALLOWED: 'common.errors.remote-not-allowed',
  PAIRING_REQUIRED: 'common.errors.pairing-required',
  INVALID_RESPONSE: 'common.errors.invalid-response',
  CERT_NOT_TRUSTED: 'common.errors.cert-not-trusted',
  FINGERPRINT_MISMATCH: 'common.errors.fingerprint-mismatch',
  STORAGE_ERROR: 'common.errors.storage',
  ACCOUNT_DISABLED: 'common.errors.account-disabled',
  MODULE_DISABLED: 'common.errors.module-disabled',
  MODULE_HARDWARE_INSUFFICIENT: 'common.errors.module-hardware',
  MODULE_COMING_SOON: 'common.errors.module-coming-soon',
  MODULE_JOB_RUNNING: 'common.errors.module-busy',
  MODULE_REQUIRED_BY: 'common.errors.module-required',
  MODULE_CORE: 'common.errors.module-core',
  MODULE_ROLES_HELD: 'common.errors.module-roles-held',
  ROLE_INACTIVE: 'common.errors.role-inactive',
};

export function serviceErrorKey(error: IApiError | null | undefined): TranslationKey {
  return (error && ERROR_KEYS[error.code]) ?? 'common.errors.unknown';
}

const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'DEADLINE_EXCEEDED',
  'SERVICE_UNAVAILABLE',
  'BAD_GATEWAY',
  'INTERNAL_ERROR',
]);

export function isRetryableServiceError(error: IApiError | null | undefined): boolean {
  return error != null && RETRYABLE_CODES.has(error.code);
}

export function toastServiceError(
  error: IApiError | null | undefined,
  title?: string,
  action?: ToastAction,
): void {
  const message = t(serviceErrorKey(error));
  if (title) toast.error(title, message, action);
  else toast.error(message, undefined, action);
}
