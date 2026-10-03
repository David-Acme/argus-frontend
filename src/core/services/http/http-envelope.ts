import type { IApiError, IServiceResponse } from '@/core/interfaces';

type Envelope = {
  status?: number;
  info?: unknown;
  errors?: IApiError | null;
};

const STATUS_CODES: Readonly<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  408: 'TIMEOUT',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'DEADLINE_EXCEEDED',
};

export function statusErrorCode(status: number): string {
  return STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
}

export function errorResponse(status: number, code: string, message: string): IServiceResponse<never> {
  return { status, ok: false, info: null, errors: { code, message } };
}

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

function parseEnvelope(raw: string): Envelope | null {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Envelope) : null;
  } catch {
    return null;
  }
}

const isApiError = (value: unknown): value is IApiError =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as IApiError).code === 'string' &&
  typeof (value as IApiError).message === 'string';

export function readEnvelope<T>(status: number, raw: string): IServiceResponse<T> {
  const envelope = parseEnvelope(raw);
  if (!envelope) {
    return isSuccess(status)
      ? errorResponse(status, 'INVALID_RESPONSE', 'Invalid JSON response')
      : errorResponse(status, statusErrorCode(status), `HTTP ${status}`);
  }
  if (isSuccess(status) && !envelope.errors) {
    return { status, ok: true, info: (envelope.info as T | null) ?? null, errors: null };
  }
  const errors = isApiError(envelope.errors)
    ? envelope.errors
    : { code: statusErrorCode(status), message: `HTTP ${status}` };
  return { status, ok: false, info: null, errors };
}
