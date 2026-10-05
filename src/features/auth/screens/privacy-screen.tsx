import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PrivacyChoices } from '@/core/types';
import { ConsentForm, NO_CHOICES, consentDraft } from '@/features/privacy';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { ONBOARDING_STEPS } from '@/features/auth/constants/welcome';
import { clearInviteToken } from '@/features/auth/model/invite-slot';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';

const ENROLL_MODES = ['owner-enroll', 'invite-enroll'] as const;

type EnrollMode = (typeof ENROLL_MODES)[number];

const enrollModeOf = (value: string | undefined): EnrollMode =>
  ENROLL_MODES.find((mode) => mode === value) ?? 'owner-enroll';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const enrollMode = enrollModeOf(mode);

  const accept = (choices: PrivacyChoices) => {
    consentDraft.set(choices);
    router.replace({ pathname: '/welcome/face', params: { mode: enrollMode } });
  };

  const decline = () => {
    consentDraft.take();
    if (enrollMode === 'invite-enroll') clearInviteToken();
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
            <OnboardingSteps current={ONBOARDING_STEPS.privacy} total={ONBOARDING_STEPS.total} />
          }
          onAccept={accept}
          onDecline={decline}
        />
      </ScrollView>
    </View>
  );
}
