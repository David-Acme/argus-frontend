import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { ScopedTheme } from 'uniwind';
import { useDevicePermissions } from '@/shared/hooks/use-device-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Text } from '@/shared/ui/text';
import { argusCallSupported, CallSurface, useCall } from '@/features/voice';
import { callStepOf } from '@/features/auth/model/first-call';
import { flowOf } from '@/features/auth/model/onboarding-flow';
import type { OnboardingHref } from '@/features/auth/model/onboarding-flow';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

type FirstCallProps = { next: OnboardingHref | '/' };

function FirstCall({ next }: FirstCallProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const call = useCall({ purpose: 'onboarding' });
  const finish = useCallback(() => router.replace(next), [next, router]);

  useEffect(() => {
    if (call.phase === 'done') finish();
  }, [call.phase, finish]);

  return (
    <CallSurface
      phase={call.phase}
      muted={call.muted}
      error={call.error}
      transcript={call.transcript}
      actions={call.actions}
      connectedAt={call.connectedAt}
      footnote={
        <Text variant="caption" tone="3" align="center">
          {t('screens.welcome.call.tip')}
        </Text>
      }
      onToggleMute={call.toggleMute}
      onHangUp={finish}
      onRetry={call.retry}
    />
  );
}

export default function OnboardingCallScreen() {
  const flow = flowOf(useLocalSearchParams<{ flow?: string }>());
  const { next } = useOnboardingNext();
  const { permissions, loaded } = useDevicePermissions('call');
  const after = next(flow, 'meet');
  const step = callStepOf({
    supported: argusCallSupported(),
    loaded,
    microphone: permissions.find((permission) => permission.id === 'microphone')?.granted ?? true,
  });
  if (step === 'skip') return <Redirect href={after} />;
  if (step === 'wait')
    return (
      <ScopedTheme theme="dark">
        <View className="bg-bg flex-1" />
      </ScopedTheme>
    );
  return <FirstCall next={after} />;
}
