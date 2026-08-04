import { useOrbStore } from '@/core/stores';
import type { OrbState } from '@/core/types';
import { Orb } from '@/shared/components/orb';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useMicLevel } from '@/shared/hooks/use-mic-level';
import { useCallback } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

type StateOption = {
  key: OrbState;
  label: string;
};

const STATE_OPTIONS: StateOption[] = [
  { key: 'idle', label: 'Reposo' },
  { key: 'listening', label: 'Escuchando' },
  { key: 'thinking', label: 'Pensando' },
  { key: 'speaking', label: 'Hablando' },
  { key: 'error', label: 'Error' },
];

const STATE_HINTS: Record<OrbState, string> = {
  idle: 'Giro leve, respiración lenta',
  listening: 'Anillo más abierto y atento',
  thinking: 'Cometa girando alrededor del anillo',
  speaking: 'Microsaltos al compás de la voz',
  error: 'Tono desplazado al color de error',
};

export default function OrbScreen() {
  const { width } = useWindowDimensions();
  const state = useOrbStore((s) => s.state);
  const setState = useOrbStore((s) => s.setState);
  const { level, isRecording, error, toggle } = useMicLevel();

  const orbSize = Math.min(340, width * 0.86);

  const levelStyle = useAnimatedStyle(() => ({
    width: `${Math.max(2, level.value * 100)}%`,
  }));

  const handleToggleMic = useCallback(async () => {
    const started = await toggle();
    setState(started ? 'speaking' : 'idle');
  }, [toggle, setState]);

  return (
    <View className="flex-1 bg-background px-6 pt-14">
      <View className="items-center gap-1">
        <Text className="text-xl font-semibold text-foreground">Asistente</Text>
        <Text variant="muted" className="text-center">
          {STATE_HINTS[state]}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Orb audioLevel={level} style={{ width: orbSize, height: orbSize }} />
      </View>

      <View className="gap-5 pb-10">
        <View className="flex-row items-center gap-4">
          <View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-secondary">
            <Animated.View className="h-full rounded-full bg-accent" style={levelStyle} />
          </View>
          <Button
            variant={isRecording ? 'default' : 'secondary'}
            size="icon"
            className="rounded-full"
            onPress={handleToggleMic}
            accessibilityLabel={isRecording ? 'Detener micrófono' : 'Activar micrófono'}
          >
            <Icon name={isRecording ? 'mic-off' : 'mic'} />
          </Button>
        </View>

        {error ? (
          <Text variant="muted" className="text-center text-error">
            {error}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-surface-secondary p-1">
          {STATE_OPTIONS.map((option) => (
            <Button
              key={option.key}
              variant={state === option.key ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full px-3"
              onPress={() => setState(option.key)}
            >
              <Text>{option.label}</Text>
            </Button>
          ))}
        </View>
      </View>
    </View>
  );
}
