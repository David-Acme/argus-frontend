import { Linking } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { FaceFinder } from '@/features/auth/components/face-finder';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import type { OnboardingTone } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import type { OnboardingTopProps } from '@/features/auth/components/onboarding-top';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';

export type FaceDeniedProps = {
  tone: OnboardingTone;
  top: OnboardingTopProps;
  onAskAgain: () => Promise<void>;
};

export function FaceDenied({ tone, top, onAskAgain }: FaceDeniedProps) {
  const { t } = useTranslation();
  const { finder } = useOnboardingLayout();
  return (
    <OnboardingFrame
      tone={tone}
      top={<OnboardingTop {...top} />}
      footer={
        <>
          <Button
            variant="primary"
            block
            label={t('screens.face.denied.settings')}
            onPress={() => Linking.openSettings()}
          />
          <Button variant="ghost" block label={t('screens.face.denied.ask')} onPress={onAskAgain} />
        </>
      }>
      <OnboardingHeading
        title={t('screens.face.denied.title')}
        lead={t('screens.face.denied.phone')}
      />
      <OnboardingMid>
        <FaceFinder size={finder} progress={0} label={t('screens.face.finder-label')} />
      </OnboardingMid>
    </OnboardingFrame>
  );
}
