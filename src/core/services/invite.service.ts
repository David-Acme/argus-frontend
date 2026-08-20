import { httpService } from '@/core/services/http.service';
import { netService } from '@/core/services/net';
import type {
  IInviteAcceptResult,
  IInviteCreateInput,
  IInviteCreated,
  IServiceResponse,
} from '@/core/interfaces';

const INVITE_PATH = '/invite';
const INVITE_ACCEPT_PATH = '/invite/accept';

class InviteService {
  async create(input: IInviteCreateInput): Promise<IServiceResponse<IInviteCreated>> {
    return httpService.post<IInviteCreated>(INVITE_PATH, input);
  }

  /** Pre-CA (TOFU): trust-any + fingerprint verification against the QR, done by the consumer. */
  async accept(code: string, host: string, port: number): Promise<IServiceResponse<IInviteAcceptResult>> {
    try {
      const result = await netService.requestTrustAny({
        url: `https://${host}:${port}${INVITE_ACCEPT_PATH}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      let payload: { info?: IInviteAcceptResult; errors?: { code: string; message: string } };
      try {
        payload = JSON.parse(result.body) as typeof payload;
      } catch {
        return {
          status: result.status,
          ok: false,
          info: null,
          errors: { code: 'INVALID_RESPONSE', message: 'Invalid JSON response' },
        };
      }

      if (result.status >= 200 && result.status < 300 && payload.info) {
        return { status: result.status, ok: true, info: payload.info, errors: null };
      }
      return {
        status: result.status,
        ok: false,
        info: null,
        errors: payload.errors ?? { code: 'HTTP_ERROR', message: `HTTP ${result.status}` },
      };
    } catch (error) {
      const netError = error as { code?: string; message?: string };
      return {
        status: 0,
        ok: false,
        info: null,
        errors: { code: netError.code ?? 'NETWORK_ERROR', message: netError.message ?? 'Network error' },
      };
    }
  }
}

export const inviteService = new InviteService();
