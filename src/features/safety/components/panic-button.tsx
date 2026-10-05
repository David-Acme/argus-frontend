import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { PANIC_HOLD_MS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { safetyService } from '@/features/safety/services/safety.service';

type PanicButtonProps = {
  environmentId?: number;
  className?: string;
};

type PanicState = 'idle' | 'holding' | 'sending' | 'sent' | 'failed';

const RELEASE_MS = 160;

export function PanicButton({ environmentId, className }: PanicButtonProps) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const [state, setState] = useState<PanicState>('idle');
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const fire = async () => {
    setState('sending');
    const result = await safetyService.panic(environmentId);
    setState(result.ok ? 'sent' : 'failed');
    progress.value = withTiming(0, { duration: RELEASE_MS });
  };

  const start = () => {
    if (state === 'sending') return;
    setState('holding');
    progress.value = withTiming(1, { duration: PANIC_HOLD_MS }, (finished) => {
      if (finished) scheduleOnRN(fire);
    });
  };

  const release = () => {
    if (state !== 'holding') return;
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: RELEASE_MS });
    setState('idle');
  };

  const caption =
    state === 'sent'
      ? t('screens.safety.panic.sent')
      : state === 'failed'
        ? t('screens.safety.panic.failed')
        : state === 'sending'
          ? t('screens.safety.panic.sending')
          : t('screens.safety.panic.hint');

  return (
    <View className={cn('gap-2', className)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('screens.safety.panic.label')}
        accessibilityHint={t('screens.safety.panic.hint')}
        accessibilityActions={[{ name: 'longpress', label: t('screens.safety.panic.label') }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'longpress') void fire();
        }}
        onPressIn={start}
        onPressOut={release}
        disabled={state === 'sending'}
        className="border-error/40 bg-card dark:bg-card-secondary min-h-14 flex-row items-center gap-3 overflow-hidden rounded-2xl border px-4">
        <Animated.View pointerEvents="none" className="bg-error/15 absolute inset-y-0 left-0" style={fillStyle} />
        <Icon name="siren" className="text-error-strong size-5" />
        <Text variant="subhead" className="text-error-strong flex-1">
          {t('screens.safety.panic.label')}
        </Text>
        {state === 'sent' ? <Icon name="check" className="text-success size-5" /> : null}
      </Pressable>
      <Text variant="caption" accessibilityLiveRegion="polite">
        {caption}
      </Text>
    </View>
  );
}
