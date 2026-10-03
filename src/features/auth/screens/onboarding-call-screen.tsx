import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { Text } from '@/shared/components/ui/text';
import { CallSurface, useCall, VoiceWebNotice } from '@/features/voice';
import { IS_NATIVE } from '@/shared/constants';
import { ONBOARDING_STEPS } from '@/features/auth/constants/welcome';
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
