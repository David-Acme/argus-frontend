import type { IApiError, IServiceResponse } from '@/core/interfaces';

type Body = {
  status?: unknown;
  info?: unknown;
  errors?: unknown;
};

const TRANSPORT_CODES: Readonly<Record<number, string>> = {
  408: 'TIMEOUT',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'DEADLINE_EXCEEDED',
};

export function foreignRefusalCode(status: number): string {
  return TRANSPORT_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'UNREACHABLE_ROUTE');
}

export function errorResponse(status: number, code: string, message: string): IServiceResponse<never> {
  return { status, ok: false, info: null, errors: { code, message } };
}

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

function parseBody(raw: string): Body | null {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Body) : null;
  } catch {
    return null;
  }
}

const isApiError = (value: unknown): value is IApiError =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as IApiError).code === 'string' &&
  typeof (value as IApiError).message === 'string';

const isApiErrorList = (value: unknown): value is readonly IApiError[] =>
  Array.isArray(value) && value.length > 0 && value.every(isApiError);

function carriedError(errors: unknown): IApiError | null {
  if (isApiError(errors)) return errors;
  if (!isApiErrorList(errors)) return null;
  const [first] = errors;
  if (!first) return null;
  return { code: first.code, message: first.message, list: errors.map(({ code, message }) => ({ code, message })) };
}

const isEnvelope = (body: Body): boolean => typeof body.status === 'number' && 'info' in body && 'errors' in body;

export function readEnvelope<T>(status: number, raw: string): IServiceResponse<T> {
  const body = parseBody(raw);
  if (isSuccess(status)) {
    if (!body) return errorResponse(status, 'INVALID_RESPONSE', 'Invalid JSON response');
    if (!body.errors) return { status, ok: true, info: (body.info as T | null) ?? null, errors: null };
    const refusal = carriedError(body.errors);
    return refusal
      ? { status, ok: false, info: null, errors: refusal }
      : errorResponse(status, 'INVALID_RESPONSE', 'Unreadable errors in a success answer');
  }
  const refusal = body && isEnvelope(body) ? carriedError(body.errors) : null;
  return refusal
    ? { status, ok: false, info: null, errors: refusal }
    : errorResponse(status, foreignRefusalCode(status), `HTTP ${status}`);
}
