import type { HttpMethod, NetHttpFile, NetHttpResult, NetPairedInstance } from '@/core/types';
import { netService } from '@/core/services/net';
import { serviceUrl, addressUnreachable } from '@/core/services/net/net-routes';
import { httpAuth } from './http-auth';
import { errorResponse, readEnvelope } from './http-envelope';
import { reportRefusal } from './http-refusal';
import { mayClearSession } from './refresh-response';
import { writeRefusal, writeRefusalCode } from './write-refusal';
import type { IHttpConfig, IServiceResponse } from '@/core/interfaces';

type HttpRequestInput = {
  method: HttpMethod;
  path: string;
  body?: string;
  files?: NetHttpFile[];
  config?: IHttpConfig;
};

class HttpService {

  async get<T>(path: string, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.request<T>({ method: 'GET', path, config });
  }

  async post<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.change<T>({ method: 'POST', path, body: JSON.stringify(body ?? {}), config });
  }

  async patch<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.change<T>({ method: 'PATCH', path, body: JSON.stringify(body ?? {}), config });
  }

  async put<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.change<T>({ method: 'PUT', path, body: JSON.stringify(body ?? {}), config });
  }

  async delete<T>(path: string, body?: unknown, config?: IHttpConfig): Promise<IServiceResponse<T>> {
    return this.change<T>({
      method: 'DELETE',
      path,
      body: body === undefined ? undefined : JSON.stringify(body),
      config,
    });
  }

  async postMultipart<T>(
    path: string,
    file: NetHttpFile,
    fields?: Record<string, string>,
    config?: IHttpConfig,
  ): Promise<IServiceResponse<T>> {
    return this.request<T>({ method: 'POST', path, body: JSON.stringify(fields ?? {}), files: [file], config });
  }

  private async change<T>(request: HttpRequestInput): Promise<IServiceResponse<T>> {
    const response = await this.request<T>(request);
    if (response.ok || !response.errors) return response;
    const refusal = writeRefusal({ method: request.method, status: response.status, code: response.errors.code });
    if (!refusal) return response;
    return { ...response, errors: { ...response.errors, code: writeRefusalCode(refusal) } };
  }

  private async request<T>(input: HttpRequestInput): Promise<IServiceResponse<T>> {
    const { method, path, body, files } = input;
    const config = input.config ?? {};
    let instance;
    try {
      instance = await netService.instance();
    } catch {
      return errorResponse(0, 'STORAGE_ERROR', 'The pairing could not be read');
    }
    if (!instance) return errorResponse(0, 'PAIRING_REQUIRED', 'No paired instance');

    const credential = httpAuth().credential();
    const send = (target: typeof instance): Promise<NetHttpResult> =>
      netService.request({
        url: serviceUrl(target, path),
        method,
        headers: { ...this.buildHeaders(Boolean(files), credential.accessToken), ...config.headers },
        body,
        files,
      });
    let result;
    try {
      result = await send(instance);
    } catch (error) {
      const netError = error as { code?: string; message?: string };
      const failure = netError.code ?? 'NETWORK_ERROR';
      const relocated = addressUnreachable(failure) ? await this.relocatedInstance() : null;
      if (!relocated) return errorResponse(0, failure, netError.message ?? 'Network error');
      try {
        result = await send(relocated);
      } catch (retryError) {
        const retryNetError = retryError as { code?: string; message?: string };
        return errorResponse(0, retryNetError.code ?? 'NETWORK_ERROR', retryNetError.message ?? 'Network error');
      }
    }

    if (result.status === 401 && !config.skipAuthRetry) {
      const outcome = await httpAuth().refreshSession(credential);
      if (outcome === 'refreshed') {
        return this.request<T>({ ...input, config: { ...config, skipAuthRetry: true } });
      }
      if (mayClearSession(outcome)) void httpAuth().clearSession(credential);
      if (outcome === 'unavailable' && credential.accessToken) {
        return errorResponse(503, 'SERVICE_UNAVAILABLE', 'The session could not be renewed right now');
      }
    }

    const response = readEnvelope<T>(result.status, result.body);
    if (!response.ok) reportRefusal(path, response.errors);
    return response;
  }

  private async relocatedInstance(): Promise<NetPairedInstance | null> {
    try {
      return (await netService.refreshAddress()) ? await netService.instance() : null;
    } catch {
      return null;
    }
  }

  private buildHeaders(withFile: boolean, accessToken: string | null): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!withFile) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }

}

export const httpService = new HttpService();
