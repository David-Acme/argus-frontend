import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { InfoRows } from '@/features/auth/components/info-rows';
import { LanguageSwitch } from '@/features/auth/components/language-switch';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { WELCOME_ROWS } from '@/features/auth/constants/welcome.constant';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';
import { hrefOf, ONBOARDING_FLOWS } from '@/features/auth/model/onboarding-flow';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { hero } = useOnboardingLayout();
  const [ownerStart] = ONBOARDING_FLOWS.owner;
  const [invitedStart] = ONBOARDING_FLOWS.invited;
  const start = () => {
    if (ownerStart) router.push(hrefOf('owner', ownerStart));
  };
  const join = () => {
    if (invitedStart) router.push(hrefOf('invited', invitedStart));
  };
  return (
    <OnboardingFrame
      top={<OnboardingTop trailing={<LanguageSwitch />} />}
      footer={
        <>
          <Button variant="primary" block label={t('screens.welcome.cta')} onPress={start} />
          {IS_NATIVE ? (
            <Button
              variant="ghost"
              block
              label={t('screens.welcome.join-invitation')}
              onPress={join}
            />
          ) : null}
        </>
      }>
      <View className="mt-4 items-center gap-2">
        <Presence state="idle" size={hero} accessibilityLabel={t('screens.welcome.estela-label')} />
        <Text variant="heroCompact" heading={1} align="center">
          {t('screens.welcome.title')}
        </Text>
        <Text variant="body" tone="2" align="center">
          {t('screens.welcome.subtitle')}
        </Text>
        <View>
          <Chip icon="lock" label={t('screens.welcome.promise')} />
        </View>
      </View>
      <InfoRows rows={WELCOME_ROWS} />
      <View className="min-h-6 flex-1" />
    </OnboardingFrame>
  );
}
