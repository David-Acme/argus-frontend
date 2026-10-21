import { useEffect, useState } from 'react';
import type { PresenceCue, PresenceEvent } from '@/shared/ui/presence';

const PULSE_MS = 2000;

export function useEventPulse(name: PresenceEvent | null): PresenceCue | undefined {
  const [cue, setCue] = useState<PresenceCue | undefined>(undefined);
  useEffect(() => {
    if (!name) return;
    const handle = globalThis.setInterval(() => setCue((current) => ({ name, id: (current?.id ?? 0) + 1 })), PULSE_MS);
    return () => globalThis.clearInterval(handle);
  }, [name]);
  return name ? cue : undefined;
}
