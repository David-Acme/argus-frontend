import type { HttpMethod, NetHttpFile } from '@/core/types';
import { netService } from '@/core/services/net';
import { httpAuth } from './http-auth';
import type { IApiError, IHttpConfig, IServiceResponse } from '@/core/interfaces';

interface Envelope {
  status?: number;
  info?: unknown;
  errors?: IApiError | null;
}

function errorResponse(status: number, code: string, message: string): IServiceResponse<never> {
  return { status, ok: false, info: null, errors: { code, message } };
}

class HttpService {
  private baseUrlCache: { instanceId: string; url: string } | null = null;

  async get<T>(path: string, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.request<T>('GET', path, undefined, undefined, config);
  }

  async post<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.request<T>('POST', path, JSON.stringify(body ?? {}), undefined, config);
  }

  async patch<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.request<T>('PATCH', path, JSON.stringify(body ?? {}), undefined, config);
  }

  async put<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.request<T>('PUT', path, JSON.stringify(body ?? {}), undefined, config);
  }

  async delete<T>(path: string, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.request<T>('DELETE', path, undefined, undefined, config);
  }

  /** Multipart: fields become regular form fields and files keep their own names. */
  async postMultipart<T>(
    path: string,
    file: NetHttpFile,
    fields?: Record<string, string>,
    config?: IHttpConfig,
  ): Promise<IServiceResponse<T>> {
    return this.request<T>('POST', path, JSON.stringify(fields ?? {}), [file], config);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body: string | undefined,
    files: NetHttpFile[] | undefined,
    config: IHttpConfig = {},
  ): Promise<IServiceResponse<T>> {
    const url = await this.baseUrl();
    if (!url) return errorResponse(0, 'PAIRING_REQUIRED', 'No paired instance');

    let result;
    try {
      result = await netService.request({
        url: `${url}${path}`,
        method,
        headers: await this.buildHeaders(Boolean(files)),
        body,
        files,
      });
    } catch (error) {
      const netError = error as { code?: string; message?: string };
      return errorResponse(0, netError.code ?? 'NETWORK_ERROR', netError.message ?? 'Network error');
    }

    if (result.status === 401 && !config.skipAuthRetry) {
      const refreshed = await httpAuth().refreshSession();
      if (refreshed) {
        return this.request<T>(method, path, body, files, { skipAuthRetry: true });
      }
      void httpAuth().clearSession();
    }

    return this.parse<T>(result.status, result.body);
  }

  private async baseUrl(): Promise<string | null> {
    const instance = await netService.instance();
    if (!instance) return null;
    if (this.baseUrlCache?.instanceId === instance.instanceId) return this.baseUrlCache.url;
    const url = `https://${instance.host}:${instance.port}`;
    this.baseUrlCache = { instanceId: instance.instanceId, url };
    return url;
  }

  private async buildHeaders(withFile: boolean): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!withFile) headers['Content-Type'] = 'application/json';
    const accessToken = httpAuth().getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }

  private parse<T>(status: number, raw: string): IServiceResponse<T> {
    let envelope: Envelope;
    try {
      envelope = raw ? (JSON.parse(raw) as Envelope) : {};
    } catch {
      return errorResponse(status, 'INVALID_RESPONSE', 'Invalid JSON response');
    }

    if (status >= 200 && status < 300 && !envelope.errors) {
      return { status, ok: true, info: (envelope.info as T | null) ?? null, errors: null };
    }

    const errors = envelope.errors ?? {
      code: status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR',
      message: `HTTP ${status}`,
    };
    return { status, ok: false, info: null, errors };
  }

}

export const httpService = new HttpService();
