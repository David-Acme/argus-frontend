import { netService } from '@/core/services/net';
import { hostLabel } from '@/shared/libs/pairing-qr';
import { routePortsOf } from './net-routes';
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
    pairing = await netService.pair({
      host,
      ip: discovery.ip,
      port: qr.port,
      code: qr.code,
      routes: routePortsOf(discovery.routes),
      expect:
        qr.caFingerprint && qr.instanceId
          ? { caFingerprint: qr.caFingerprint, instanceId: qr.instanceId }
          : undefined,
    });
  } catch (error) {
    throw toNetError(error);
  }

  return { pairing, discovery: { host, ip: discovery.ip, port: qr.port } };
}