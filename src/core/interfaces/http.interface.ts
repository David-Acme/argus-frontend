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
