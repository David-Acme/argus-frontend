import type { SessionRefreshOutcome } from '@/core/types';

export interface IHttpConfig {
  skipAuthRetry?: boolean;
}

export interface IApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

export interface IServiceResponse<T> {
  status: number;
  ok: boolean;
  info: T | null;
  errors: IApiError | null;
}

export interface IHttpAuthBridge {
  getAccessToken(): string | null;
  refreshSession(): Promise<SessionRefreshOutcome>;
  clearSession(): Promise<void>;
}
