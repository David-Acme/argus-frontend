import { netService } from '@/core/services/net';
import { hostLabel } from '@/shared/libs/pairing-qr';
import type { NetError, NetPairing, QrPairingPayload } from '@/core/types';

export interface PairWithQrResult {
  pairing: NetPairing;
  discovery: { host: string; ip: string; port: number };
}

const toNetError = (error: unknown): NetError => {
  const netError = error as { code?: string; message?: string };
  return {
    code: (netError.code ?? 'NETWORK_ERROR') as NetError['code'],
    message: netError.message ?? 'Network error',
  };
};

/**
 * Pairing via the server banner QR: the QR provides host/port/code/fingerprints
 * but not the IP → resolved with `discover()` and the fingerprint is verified
 * against the real POST /pairing response.
 */
export async function pairWithQr(qr: QrPairingPayload): Promise<PairWithQrResult> {
  const discovery = await netService.discover();
  if (!discovery.ip) {
    throw { code: 'DISCOVERY_NOT_FOUND', message: 'No Argus server found on the network' } as NetError;
  }

  const host = qr.host.toLowerCase();
  const hostMatches = discovery.host.toLowerCase() === host || hostLabel(discovery.host) === hostLabel(host);
  const portMatches = discovery.port === 0 || discovery.port === qr.port;
  if (!hostMatches || !portMatches) {
    throw {
      code: 'HOST_NOT_ALLOWED',
      message: `Discovered server does not match the QR (${discovery.host}:${discovery.port})`,
    } as NetError;
  }

  let pairing: NetPairing;
  try {
    pairing = await netService.pair(host, discovery.ip, qr.port, qr.code);
  } catch (error) {
    throw toNetError(error);
  }

  // With a full QR we cross-check fingerprints/instanceId (closes the QR TOFU gap).
  // With a manual code (no fingerprints) the Nitro already verifies code↔fingerprint.
  if (qr.caFingerprint && qr.instanceId) {
    const fingerprintMatches =
      pairing.caFingerprint.toLowerCase() === qr.caFingerprint.toLowerCase();
    const instanceMatches = pairing.instanceId.toLowerCase() === qr.instanceId.toLowerCase();
    if (!fingerprintMatches || !instanceMatches) {
      throw {
        code: 'FINGERPRINT_MISMATCH',
        message: 'The server fingerprint does not match the scanned QR',
      } as NetError;
    }
  }

  return { pairing, discovery: { host, ip: discovery.ip, port: qr.port } };
}