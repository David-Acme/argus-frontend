import { useEffect, useState } from 'react';
import { readAutostart, writeAutostart } from '@/core/services/desktop/desktop-shell';
import type { NetError } from '@/core/types';
import { asNetError, commitAutostart } from '@/features/settings/model/desktop-autostart';

type AutostartStatus = 'loading' | 'idle' | 'saving';

export function useDesktopAutostart() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<AutostartStatus>('loading');
  const [error, setError] = useState<NetError | null>(null);

  useEffect(() => {
    let current = true;
    readAutostart()
      .then((value) => {
        if (current) setEnabled(value);
      })
      .catch((failure: unknown) => {
        if (current) setError(asNetError(failure));
      })
      .finally(() => {
        if (current) setStatus('idle');
      });
    return () => {
      current = false;
    };
  }, []);

  const change = (next: boolean) => {
    if (status !== 'idle') return;
    setStatus('saving');
    void commitAutostart(next, writeAutostart).then((outcome) => {
      setEnabled(outcome.enabled);
      setError(outcome.error);
      setStatus('idle');
    });
  };

  return { enabled, status, error, change };
}
