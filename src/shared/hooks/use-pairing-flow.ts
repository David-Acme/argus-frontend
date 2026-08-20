import { useCallback, useState } from 'react';
import { pairWithQr } from '@/core/services/net/net-pairing';
import { netService } from '@/core/services/net';
import { parsePairingQr, isPairingCode } from '@/shared/libs/pairing-qr';
import { ARGUS_HOST } from '@/shared/constants';
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
  run: (value: string) => Promise<void>;
  reset: () => void;
};

/** Manual fallback: the value is the 8-hex code → discover (IP) + direct pair. */
async function pairWithCode(code: string): Promise<void> {
  const discovery = await netService.discover();
  if (!discovery.ip) {
    throw { code: 'DISCOVERY_NOT_FOUND', message: 'No Argus server found on the network' } as NetError;
  }
  await netService.pair(ARGUS_HOST, discovery.ip, discovery.port, code.trim());
}

/**
 * Orchestrates the pairing screen: the scanned value can be the QR JSON
 * from the banner or a plain code (manual fallback).
 */
export function usePairingFlow(): PairingFlowResult {
  const [phase, setPhase] = useState<PairingFlowPhase>('idle');
  const [error, setError] = useState<NetError | null>(null);
  const [qr, setQr] = useState<QrPairingPayload | null>(null);

  const run = useCallback(async (value: string) => {
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
        await pairWithCode(value);
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