import { httpService } from '@/core/services/http.service';
import { netService } from '@/core/services/net';
import { validateInvitationResolution } from '@/core/services/invitation-resolution';
import type {
  IInviteAcceptResult,
  IInviteCreateInput,
  IInviteCreated,
  IInvitationRecord,
  IServiceResponse,
} from '@/core/interfaces';
import type { InvitationQrPayload } from '@/core/types';

const INVITATION_PATH = '/invitation';

type TrustAnyEnvelope = {
  info?: unknown;
  errors?: { code?: unknown; message?: unknown } | null;
};

const failed = <T>(status: number, code: string, message: string): IServiceResponse<T> => ({
  status,
  ok: false,
  info: null,
  errors: { code, message },
});

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

  /** Resolves the QR over temporary TLS, validates its pinned CA, then adopts strict TLS. */
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
      return failed(0, netError.code ?? 'NETWORK_ERROR', netError.message ?? 'Network error');
    }

    let envelope: TrustAnyEnvelope;
    try {
      envelope = raw.body ? (JSON.parse(raw.body) as TrustAnyEnvelope) : {};
    } catch {
      return failed(raw.status, 'INVALID_RESPONSE', 'Invalid invitation response');
    }
    if (raw.status < 200 || raw.status >= 300 || envelope.errors) {
      const error = envelope.errors;
      return failed(
        raw.status,
        typeof error?.code === 'string' ? error.code : 'HTTP_ERROR',
        typeof error?.message === 'string' ? error.message : `HTTP ${raw.status}`,
      );
    }

    const result = validateInvitationResolution(qr, envelope.info);
    if (!result) {
      return failed(raw.status, 'FINGERPRINT_MISMATCH', 'Invitation trust validation failed');
    }

    try {
      await netService.adoptPairing(
        {
          caPem: result.caPem,
          caFingerprint: result.caFingerprint,
          serverFingerprint: result.serverFingerprint,
          instanceId: result.instanceId,
          port: result.port,
          scheme: result.scheme,
        },
        qr.host,
        qr.ip,
      );
    } catch (error) {
      const netError = error as { code?: string; message?: string };
      return failed(0, netError.code ?? 'CERT_NOT_TRUSTED', netError.message ?? 'Certificate rejected');
    }

    return { status: raw.status, ok: true, info: result, errors: null };
  }
}

export const inviteService = new InviteService();
