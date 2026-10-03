import type { SessionCredential, SessionRefreshOutcome } from '@/core/types';

export interface IHttpConfig {
  skipAuthRetry?: boolean;
  headers?: Readonly<Record<string, string>>;
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
  credential(): SessionCredential;
  refreshSession(failed: SessionCredential): Promise<SessionRefreshOutcome>;
  clearSession(failed: SessionCredential): Promise<void>;
}
