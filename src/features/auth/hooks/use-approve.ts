import { useCallback, useRef, useState } from 'react';
import type { DeviceLoginDetails } from '@/core/types';
import { authService } from '@/core/services/auth.service';
import {
  decidedPhase,
  decidingPhase,
  isConfirming,
  refusedPhase,
} from '@/features/auth/model/approve';
import type { ApproveDecision, ApprovePhase } from '@/features/auth/model/approve';
import { parseLoginQr } from '@/features/auth/model/login-qr';

export type Approve = {
  phase: ApprovePhase;
  details: DeviceLoginDetails | null;
  scanned: (raw: string) => Promise<void>;
  approve: () => Promise<void>;
  deny: () => Promise<void>;
};

const CALLS: Readonly<
  Record<ApproveDecision, (id: string) => Promise<{ ok: boolean; status: number }>>
> = {
  approve: (id) => authService.approveDeviceLogin(id),
  deny: (id) => authService.denyDeviceLogin(id),
};

export function useApprove(): Approve {
  const [phase, setPhase] = useState<ApprovePhase>('idle');
  const [details, setDetails] = useState<DeviceLoginDetails | null>(null);
  const deciding = useRef(false);

  const scanned = useCallback(async (raw: string) => {
    const payload = parseLoginQr(raw);
    if (!payload) {
      setPhase('error');
      return;
    }
    setPhase('checking');
    const answer = await authService.deviceLoginDetails(payload.id);
    if (answer.ok && answer.info) {
      setDetails(answer.info);
      setPhase('confirm');
      return;
    }
    setPhase(refusedPhase(answer.status));
  }, []);

  const decide = async (decision: ApproveDecision) => {
    if (!details || deciding.current) return;
    deciding.current = true;
    setPhase(decidingPhase(decision));
    try {
      const next = decidedPhase(decision, await CALLS[decision](details.challengeId));
      setPhase(next);
      if (!isConfirming(next)) setDetails(null);
    } finally {
      deciding.current = false;
    }
  };

  return {
    phase,
    details,
    scanned,
    approve: () => decide('approve'),
    deny: () => decide('deny'),
  };
}
