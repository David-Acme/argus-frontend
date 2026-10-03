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

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/;
const IPV6_PATTERN = /^\[?([0-9a-fA-F:]+)\]?(?::(\d{1,5}))?$/;

function validPort(value: string | undefined): number | null {
  const port = value ? Number(value) : ARGUS_PAIRING_PORT;
  return port > 0 && port < 65536 ? port : null;
}

function parseAddress(address: string): ManualAddress | null {
  const value = address.trim();
  const ipv4 = value.match(IPV4_PATTERN);
  if (ipv4) {
    const octets = ipv4.slice(1, 5).map(Number);
    const port = validPort(ipv4[5]);
    if (octets.some((octet) => octet > 255) || port === null) return null;
    return { ip: octets.join('.'), port };
  }
  const [, host = '', rawPort] = value.match(IPV6_PATTERN) ?? [];
  if (host.includes(':') && (value.startsWith('[') || !rawPort)) {
    const port = validPort(rawPort);
    return port === null ? null : { ip: host, port };
  }
  return null;
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