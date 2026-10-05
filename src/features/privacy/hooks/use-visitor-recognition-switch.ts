import { useCallback, useState } from 'react';
import { usePrivacyDirectory } from '@/features/privacy/hooks/use-privacy-directory';

export function useVisitorRecognitionSwitch() {
  const { directory, setSwitch } = usePrivacyDirectory();
  const [pending, setPending] = useState(false);

  const change = useCallback(
    async (value: boolean): Promise<boolean> => {
      setPending(true);
      const saved = await setSwitch('visitorRecognition', value, value);
      setPending(false);
      return saved;
    },
    [setSwitch]
  );

  const enable = useCallback(() => change(true), [change]);
  const disable = useCallback(() => change(false), [change]);

  return {
    enabled: directory?.household.visitorRecognition ?? false,
    acknowledgedAt: directory?.visitorAcknowledgedAt ?? null,
    enable,
    disable,
    pending,
  };
}
