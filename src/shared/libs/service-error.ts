import { t } from '@/core/i18n';
import { WRITE_NOT_SENT, WRITE_UNCONFIRMED } from '@/core/services/http/write-refusal';
import type { IApiError } from '@/core/interfaces';
import type { ToastAction, TranslationKey } from '@/core/types';
import { toast } from './toast';

const ERROR_KEYS: Readonly<Record<string, TranslationKey>> = {
  NETWORK_ERROR: 'common.errors.network',
  TIMEOUT: 'common.errors.timeout',
  CONNECTION_LOST: 'common.errors.network',
  [WRITE_NOT_SENT]: 'common.errors.write-not-sent',
  [WRITE_UNCONFIRMED]: 'common.errors.write-unconfirmed',
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
  APP_SIREN_DISABLED: 'common.errors.app-siren-disabled',
  CAMERA_SECRET_NOT_SEALED: 'common.errors.camera-secret',
  REMOTE_NOT_ALLOWED: 'common.errors.remote-not-allowed',
  PAIRING_REQUIRED: 'common.errors.pairing-required',
  INVALID_RESPONSE: 'common.errors.invalid-response',
  UNREACHABLE_ROUTE: 'common.errors.unreachable-route',
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
  DESKTOP_SHELL_ERROR: 'common.errors.desktop-shell',
  GUARD_OFF_DUTY: 'common.errors.guard-off-duty',
  MAINTENANCE_OFF_DUTY: 'common.errors.maintenance-off-duty',
  MAINTENANCE_OUT_OF_SCOPE: 'common.errors.maintenance-out-of-scope',
  PRESETS_NOT_YOURS: 'common.errors.presets-not-yours',
  CAMERA_CONTROL_LOCKED: 'common.errors.camera-control-locked',
  NOT_A_TAMPER: 'common.errors.not-a-tamper',
};

export function serviceErrorKey(error: IApiError | null | undefined): TranslationKey {
  return (error && ERROR_KEYS[error.code]) ?? 'common.errors.unknown';
}

const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'CONNECTION_LOST',
  'DEADLINE_EXCEEDED',
  'SERVICE_UNAVAILABLE',
  'BAD_GATEWAY',
  'INTERNAL_ERROR',
  WRITE_NOT_SENT,
  WRITE_UNCONFIRMED,
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
