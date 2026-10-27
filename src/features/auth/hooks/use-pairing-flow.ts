import { useCallback, useEffect, useRef, useState } from 'react';
import type { NetDiscovery, NetError, NetErrorCode } from '@/core/types';
import { netService } from '@/core/services/net';
import { pairWithQr } from '@/core/services/net/net-pairing';
import { routePortsOf } from '@/core/services/net/net-routes';
import { ARGUS_HOST } from '@/shared/constants';
import { isPairingCode, normalizePairingCode, parsePairingQr } from '@/shared/libs/pairing-qr';
import { parseAddress } from '@/features/auth/model/pairing-address';
import type { PairingSearch } from '@/features/auth/model/pairing-state';

export type PairingRequest = { code: string; address: string };

export type PairingFlow = {
  search: PairingSearch;
  error: NetErrorCode | null;
  paired: boolean;
  busy: boolean;
  connect: (request: PairingRequest) => Promise<void>;
  scanned: (value: string) => Promise<void>;
  searchAgain: () => void;
};

const refusal = (code: NetErrorCode, message: string): Error & NetError =>
  Object.assign(new Error(message), { code });

async function findArgus(): Promise<NetDiscovery | null> {
  try {
    const found = await netService.discover();
    return found.ip ? found : null;
  } catch {
    return null;
  }
}

async function pairWithCode(request: PairingRequest, found: NetDiscovery | null): Promise<void> {
  const code = normalizePairingCode(request.code);
  if (!isPairingCode(code)) throw refusal('INVALID_PAIRING_CODE', 'Invalid pairing code');
  if (request.address.trim()) {
    const manual = parseAddress(request.address);
    if (!manual) throw refusal('HOST_NOT_ALLOWED', 'Invalid server address');
    await netService.pair({ host: ARGUS_HOST, ...manual, code, routes: {} });
    return;
  }
  const target = found ?? (await findArgus());
  if (!target) throw refusal('DISCOVERY_NOT_FOUND', 'No Argus server found on the network');
  await netService.pair({
    host: ARGUS_HOST,
    ip: target.ip,
    port: target.port,
    code,
    routes: routePortsOf(target.routes),
  });
}

const codeOf = (reason: unknown): NetErrorCode =>
  (reason as NetError | null)?.code ?? 'NETWORK_ERROR';

export function usePairingFlow(): PairingFlow {
  const [search, setSearch] = useState<PairingSearch>('searching');
  const [found, setFound] = useState<NetDiscovery | null>(null);
  const [error, setError] = useState<NetErrorCode | null>(null);
  const [paired, setPaired] = useState(false);
  const [busy, setBusy] = useState(false);
  const round = useRef(0);

  const settle = useCallback((next: NetDiscovery | null, at: number) => {
    if (at !== round.current) return;
    setFound(next);
    setSearch(next ? 'found' : 'missing');
  }, []);

  const searchAgain = useCallback(() => {
    round.current += 1;
    const at = round.current;
    setError(null);
    setSearch('searching');
    void findArgus().then((next) => settle(next, at));
  }, [settle]);

  const attempt = useCallback(async (job: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await job();
      setPaired(true);
    } catch (reason) {
      setError(codeOf(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  const connect = useCallback(
    (request: PairingRequest) => attempt(() => pairWithCode(request, found)),
    [attempt, found]
  );

  const scanned = useCallback(
    (value: string) =>
      attempt(() => {
        const qr = parsePairingQr(value);
        if (!qr) throw refusal('INVALID_PAIRING_CODE', 'Invalid pairing code');
        return pairWithQr(qr);
      }),
    [attempt]
  );

  useEffect(() => {
    const at = round.current;
    void findArgus().then((next) => settle(next, at));
  }, [settle]);

  return { search, error, paired, busy, connect, scanned, searchAgain };
}
