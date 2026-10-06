import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PrivacyChoices } from '@/core/types';
import { ConsentForm, NO_CHOICES, consentDraft } from '@/features/privacy';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { flowOf, nextHref } from '@/features/auth/model/onboarding-flow';
import { clearInviteToken } from '@/features/auth/model/invite-slot';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { IS_NATIVE } from '@/shared/constants';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const flow = flowOf({ mode });

  const accept = (choices: PrivacyChoices) => {
    consentDraft.set(choices);
    router.replace(nextHref(flow, 'privacy', { native: IS_NATIVE }) ?? '/');
  };

  const decline = () => {
    consentDraft.take();
    if (flow === 'invited') clearInviteToken();
    toast.info(
      t('screens.privacy.consent.decline-onboarding-title'),
      t('screens.privacy.consent.decline-onboarding-description')
    );
    router.replace('/welcome');
  };

  return (
    <View className="bg-background flex-1">
      <ScrollView
        contentContainerClassName="grow justify-center px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <ConsentForm
          variant="onboarding"
          initial={consentDraft.peek() ?? NO_CHOICES}
          header={
            <OnboardingSteps flow={flow} step="privacy" />
          }
          onAccept={accept}
          onDecline={decline}
        />
      </ScrollView>
    </View>
  );
}
