import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { InfoRows } from '@/features/auth/components/info-rows';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { MISMATCH_ROWS } from '@/features/auth/constants/pairing.constant';

export type MismatchViewProps = { onRestart: () => void; onBack?: () => void };

export function MismatchView({ onRestart, onBack }: MismatchViewProps) {
  const { t } = useTranslation();
  return (
    <OnboardingFrame
      top={<OnboardingTop onBack={onBack} />}
      footer={
        <Button
          variant="primary"
          block
          label={t('screens.pairing.mismatch.restart')}
          onPress={onRestart}
        />
      }>
      <OnboardingHeading
        title={t('screens.pairing.mismatch.title')}
        lead={t('screens.pairing.mismatch.lead')}
        mark={{ icon: 'alert', alert: true }}
      />
      <InfoRows rows={MISMATCH_ROWS} />
    </OnboardingFrame>
  );
}
