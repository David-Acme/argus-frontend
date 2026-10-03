import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { OnboardingSteps } from '@/shared/components/onboarding';
import { Text } from '@/shared/components/ui/text';
import { CallSurface, VoiceWebNotice } from '@/shared/components/voice';
import { IS_NATIVE, ONBOARDING_STEPS } from '@/shared/constants';
import { useCall } from '@/shared/hooks/use-call';
import { useTranslation } from '@/shared/hooks/use-translation';

function OnboardingCall() {
  const router = useRouter();
  const { t } = useTranslation();
  const call = useCall();
  const finish = useCallback(() => {
    router.replace('/');
  }, [router]);

  useEffect(() => {
    if (call.phase === 'done') finish();
  }, [call.phase, finish]);

  return (
    <CallSurface
      phase={call.phase}
      muted={call.muted}
      error={call.error}
      transcript={call.transcript}
      header={
        <View className="gap-3">
          <OnboardingSteps current={ONBOARDING_STEPS.voice} total={ONBOARDING_STEPS.total} />
          <View className="gap-1">
            <Text variant="headline">{t('screens.voice.intro-title')}</Text>
            <Text variant="caption">{t('screens.voice.intro-hint')}</Text>
          </View>
        </View>
      }
      onToggleMute={call.toggleMute}
      onInterrupt={call.interrupt}
      onHangUp={finish}
      onRetry={call.retry}
    />
  );
}

export default function VoiceScreen() {
  return IS_NATIVE ? <OnboardingCall /> : <VoiceWebNotice />;
}
