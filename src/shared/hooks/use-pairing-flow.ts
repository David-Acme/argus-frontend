import { useCallback, useState } from 'react';
import { pairWithQr } from '@/core/services/net/net-pairing';
import { netService } from '@/core/services/net';
import { parsePairingQr, isPairingCode } from '@/shared/libs/pairing-qr';
import { routePortsOf } from '@/core/services/net/net-routes';
import { ARGUS_HOST, ARGUS_PAIRING_PORT } from '@/shared/constants';
import type { NetError, QrPairingPayload } from '@/core/types';

export type PairingFlowPhase =
  | 'idle'
  | 'parsing'
  | 'discovering'
  | 'pairing'
  | 'success'
  | 'error';

export type PairingFlowResult = {
  phase: PairingFlowPhase;
  error: NetError | null;
  qr: QrPairingPayload | null;
  run: (value: string, address?: string) => Promise<void>;
  reset: () => void;
};

type ManualAddress = {
  ip: string;
  port: number;
};

function parseAddress(address: string): ManualAddress | null {
  const match = address.trim().match(/^([0-9a-fA-F.:]+?)(?::(\d{2,5}))?$/);
  if (!match) return null;
  const port = match[2] ? Number(match[2]) : ARGUS_PAIRING_PORT;
  return port > 0 && port < 65536 ? { ip: match[1], port } : null;
}

async function pairWithCode(code: string, address?: string): Promise<void> {
  if (address?.trim()) {
    const manual = parseAddress(address);
    if (!manual) {
      throw { code: 'HOST_NOT_ALLOWED', message: 'Invalid server address' } as NetError;
    }
    await netService.pair({ host: ARGUS_HOST, ip: manual.ip, port: manual.port, code: code.trim(), routes: {} });
    return;
  }
  const discovery = await netService.discover();
  await netService.pair({
    host: ARGUS_HOST,
    ip: discovery.ip,
    port: discovery.port,
    code: code.trim(),
    routes: routePortsOf(discovery.routes),
  });
}

/**
 * Orchestrates the pairing screen: the scanned value can be the QR JSON
 * from the banner or a plain code (manual fallback).
 */
export function usePairingFlow(): PairingFlowResult {
  const [phase, setPhase] = useState<PairingFlowPhase>('idle');
  const [error, setError] = useState<NetError | null>(null);
  const [qr, setQr] = useState<QrPairingPayload | null>(null);

  const run = useCallback(async (value: string, address?: string) => {
    setError(null);
    setQr(null);
    setPhase('parsing');

    const parsed = parsePairingQr(value);
    setPhase('discovering');
    try {
      if (parsed) {
        setQr(parsed);
        await pairWithQr(parsed);
      } else if (isPairingCode(value)) {
        await pairWithCode(value, address);
      } else {
        throw { code: 'INVALID_PAIRING_CODE', message: 'Invalid pairing code' } as NetError;
      }
      setPhase('success');
    } catch (reason) {
      setError(reason as NetError);
      setPhase('error');
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setQr(null);
  }, []);

  return { phase, error, qr, run, reset };
}