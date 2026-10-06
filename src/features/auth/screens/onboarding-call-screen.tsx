import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { Text } from '@/shared/components/ui/text';
import { CallSurface, useCall, VoiceWebNotice } from '@/features/voice';
import { IS_NATIVE } from '@/shared/constants';
import { flowOf, isSkippable } from '@/features/auth/model/onboarding-flow';
import { Button } from '@/shared/components/ui/button';
import { useTranslation } from '@/shared/hooks/use-translation';

function OnboardingCall() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ flow?: string }>();
  const flow = flowOf({ flow: params.flow });
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
          <View className="flex-row items-center justify-between gap-3">
            <OnboardingSteps flow={flow} step="meet" className="min-w-0 shrink" />
            {isSkippable(flow, 'meet') ? (
              <Button size="sm" variant="ghost" onPress={finish}>
                <Text>{t('screens.welcome.skip')}</Text>
              </Button>
            ) : null}
          </View>
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
