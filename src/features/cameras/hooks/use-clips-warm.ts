import { useEffect } from 'react';
import { useCapabilities } from '@/shared/hooks/use-capabilities';

export type ClipsWarmInput = { preload: () => Promise<void> };

export function useClipsWarm({ preload }: ClipsWarmInput): void {
  const { clips } = useCapabilities();
  useEffect(() => {
    if (!clips.view) return undefined;
    const timer = setTimeout(() => void preload().catch(() => undefined), 0);
    return () => clearTimeout(timer);
  }, [clips.view, preload]);
}
