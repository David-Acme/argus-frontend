import { useCallback, useState } from 'react';
import type { DeviceLoginDetails } from '@/core/types';
import { authService } from '@/core/services/auth.service';
import { refusedPhase } from '@/features/auth/model/approve';
import type { ApprovePhase } from '@/features/auth/model/approve';
import { parseLoginQr } from '@/features/auth/model/login-qr';

export type Approve = {
  phase: ApprovePhase;
  details: DeviceLoginDetails | null;
  scanned: (raw: string) => Promise<void>;
  approve: () => Promise<void>;
  deny: () => void;
};

export function useApprove(): Approve {
  const [phase, setPhase] = useState<ApprovePhase>('idle');
  const [details, setDetails] = useState<DeviceLoginDetails | null>(null);

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

  const approve = useCallback(async () => {
    if (!details) return;
    setPhase('approving');
    const answer = await authService.approveDeviceLogin(details.challengeId);
    setPhase(answer.ok ? 'approved' : refusedPhase(answer.status));
  }, [details]);

  const deny = useCallback(() => {
    setDetails(null);
    setPhase('denied');
  }, []);

  return { phase, details, scanned, approve, deny };
}
