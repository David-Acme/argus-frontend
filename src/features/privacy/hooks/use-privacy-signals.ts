import { useMemo } from 'react';
import type { PrivacyChoices, PrivacySignal } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { applicableSignals } from '@/features/privacy/model/privacy';

export function usePrivacySignals(applicable?: PrivacyChoices): readonly PrivacySignal[] {
  const { moduleActive } = useCapabilities();
  return useMemo(() => applicableSignals(applicable, moduleActive), [applicable, moduleActive]);
}
