import { httpService } from '@/core/services/http';
import { errorResponse, readEnvelope } from '@/core/services/http/http-envelope';
import { netService } from '@/core/services/net';
import { validateInvitationResolution } from './invitation-resolution';
import type {
  IInviteAcceptResult,
  IInviteCreateInput,
  IInviteCreated,
  IInvitationRecord,
  IServiceResponse,
} from '@/core/interfaces';
import type { InvitationQrPayload } from '@/core/types';

const INVITATION_PATH = '/invitation';

class InviteService {
  create(input: IInviteCreateInput): Promise<IServiceResponse<IInviteCreated>> {
    return httpService.post<IInviteCreated>(INVITATION_PATH, input);
  }

  list(): Promise<IServiceResponse<IInvitationRecord[]>> {
    return httpService.get<IInvitationRecord[]>(INVITATION_PATH);
  }

  revoke(id: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(`${INVITATION_PATH}/${id}`);
  }

  async accept(qr: InvitationQrPayload): Promise<IServiceResponse<IInviteAcceptResult>> {
    let raw;
    try {
      raw = await netService.requestTrustAny({
        url: `https://${qr.ip}:${qr.port}${INVITATION_PATH}/resolve`,
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: qr.token }),
      });
    } catch (error) {
      const netError = error as { code?: string; message?: string };
      return errorResponse(0, netError.code ?? 'NETWORK_ERROR', netError.message ?? 'Network error');
    }

    const answer = readEnvelope<unknown>(raw.status, raw.body);
    if (!answer.ok) return { ...answer, info: null };

    const result = validateInvitationResolution(qr, answer.info);
    if (!result) {
      return errorResponse(raw.status, 'FINGERPRINT_MISMATCH', 'Invitation trust validation failed');
    }

    try {
      await netService.adoptPairing({
        pairing: {
          caPem: result.caPem,
          caFingerprint: result.caFingerprint,
          serverFingerprint: result.serverFingerprint,
          instanceId: result.instanceId,
          port: result.port,
          scheme: result.scheme,
        },
        host: qr.host,
        ip: qr.ip,
        routes: {},
      });
    } catch (error) {
      const netError = error as { code?: string; message?: string };
      return errorResponse(0, netError.code ?? 'CERT_NOT_TRUSTED', netError.message ?? 'Certificate rejected');
    }

    return { status: raw.status, ok: true, info: result, errors: null };
  }
}

export const inviteService = new InviteService();
