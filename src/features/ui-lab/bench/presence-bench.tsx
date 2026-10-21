import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { perfTiers, useAutoTier, useEffects, useEffectsOverrides } from '@/shared/theme/effects';
import {
  Presence,
  presenceEvents,
  presenceStates,
  type PresenceEvent,
  type PresenceState,
} from '@/shared/ui/presence';
import { useEventPulse } from './use-event-pulse';
import { useSimulatedLevel } from './use-simulated-level';
import { useUiLoad } from './use-ui-load';

export type BenchParams = {
  tier?: string;
  size?: string;
  state?: string;
  level?: string;
  event?: string;
  still?: string;
  load?: string;
  ceiling?: string;
};

const benchTiers = [...perfTiers, 'auto'] as const;

type BenchTier = (typeof benchTiers)[number];

function pick<T extends string>(value: string | undefined, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export function PresenceBench({ params }: { params: BenchParams }) {
  const tier: BenchTier = pick(params.tier, benchTiers, 'high');
  const state: PresenceState = pick(params.state, presenceStates, 'idle');
  const event: PresenceEvent | null = params.event
    ? pick(params.event, presenceEvents, 'notify')
    : null;
  const size = Math.max(28, Math.min(320, Number(params.size) || 300));
  const level = useSimulatedLevel(params.level === '1');
  const cue = useEventPulse(event);
  const ceiling = perfTiers.find((option) => option === params.ceiling) ?? null;
  useUiLoad(Math.max(0, Math.min(40, Number(params.load) || 0)));

  useEffect(() => {
    useEffectsOverrides.setState({
      perfTier: tier === 'auto' ? null : tier,
      ceiling,
      reduceMotion: params.still === '1' ? true : null,
    });
    return () =>
      useEffectsOverrides.setState({ perfTier: null, reduceMotion: null, ceiling: null });
  }, [tier, params.still, ceiling]);

  return (
    <View className="flex-1 items-center justify-center gap-6" testID="presence-bench">
      <Presence state={state} size={size} level={level} event={cue} />
      <Text variant="caption" testID="bench-config">
        {`${tier} ${size} ${state}${level ? ' level' : ''}${event ? ` ${event}` : ''}`}
      </Text>
      {tier === 'auto' ? <AutoTierLine /> : null}
    </View>
  );
}

function AutoTierLine() {
  const { perfTier } = useEffects();
  const { report, drops } = useAutoTier();
  const probe = report
    ? `probe ${report.tier} ${report.workMs} ms ${report.dropped} late`
    : 'probe pending';
  return (
    <Text variant="caption" testID="bench-tier">
      {`tier ${perfTier} · ${probe} · ${drops} drops`}
    </Text>
  );
}
