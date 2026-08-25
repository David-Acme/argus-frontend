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

/** Credential hooks http.service needs, registered by session.service. */
export interface IHttpAuthBridge {
  getAccessToken(): string | null;
  refreshSession(): Promise<boolean>;
  clearSession(): Promise<void>;
}
