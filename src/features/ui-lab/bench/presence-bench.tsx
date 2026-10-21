import { useEffect } from 'react';
import { View } from 'react-native';
import { log } from '@/core/services/log';
import { Text } from '@/shared/components/ui/text';
import { perfTiers, useEffectsOverrides, type PerfTier } from '@/shared/theme/effects';
import { Presence, presenceEvents, presenceStates, type PresenceEvent, type PresenceState } from '@/shared/ui/presence';
import { useEventPulse } from './use-event-pulse';
import { useJsFps } from './use-js-fps';
import { useSimulatedLevel } from './use-simulated-level';

export type BenchParams = { tier?: string; size?: string; state?: string; level?: string; event?: string; still?: string };

function pick<T extends string>(value: string | undefined, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export function PresenceBench({ params }: { params: BenchParams }) {
  const tier: PerfTier = pick(params.tier, perfTiers, 'high');
  const state: PresenceState = pick(params.state, presenceStates, 'idle');
  const event: PresenceEvent | null = params.event ? pick(params.event, presenceEvents, 'notify') : null;
  const size = Math.max(28, Math.min(320, Number(params.size) || 300));
  const fps = useJsFps();
  const level = useSimulatedLevel(params.level === '1');
  const cue = useEventPulse(event);

  useEffect(() => {
    if (fps > 0) log.warn('ui-lab', `bench js-fps ${fps}`);
  }, [fps]);

  useEffect(() => {
    useEffectsOverrides.setState({ perfTier: tier, reduceMotion: params.still === '1' ? true : null });
    return () => useEffectsOverrides.setState({ perfTier: null, reduceMotion: null });
  }, [tier, params.still]);

  return (
    <View className="flex-1 items-center justify-center gap-6" testID="presence-bench">
      <Presence state={state} size={size} level={level} event={cue} />
      <Text variant="caption" testID="bench-js-fps">
        {`js ${fps}`}
      </Text>
      <Text variant="caption" testID="bench-config">
        {`${tier} ${size} ${state}${level ? ' level' : ''}${event ? ` ${event}` : ''}`}
      </Text>
    </View>
  );
}
