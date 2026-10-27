import { useState } from 'react';
import { View } from 'react-native';
import type { PrivacyChoices, PrivacySignal } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import { PRIVACY_NOTICE_VERSION, PrivacyNoticeDialog } from '@/features/privacy';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import type { OnboardingPlace } from '@/features/auth/components/onboarding-top';
import { SIGNAL_COPY } from '@/features/auth/constants/privacy-step.constant';

export type PrivacyStepProps = {
  place: OnboardingPlace;
  signals: readonly PrivacySignal[];
  choices: PrivacyChoices;
  failed: boolean;
  disabled?: boolean;
  onChange: (signal: PrivacySignal, value: boolean) => void;
  onAccept: () => Promise<void> | void;
  onBack?: () => void;
};

export function PrivacyStep({
  place,
  signals,
  choices,
  failed,
  disabled = false,
  onChange,
  onAccept,
  onBack,
}: PrivacyStepProps) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState(false);
  return (
    <OnboardingFrame
      top={<OnboardingTop onBack={onBack} place={place} />}
      footer={
        <>
          <Button
            variant="primary"
            block
            label={t(failed ? 'common.retry' : 'screens.welcome.privacy.accept')}
            onPress={onAccept}
            disabled={disabled}
          />
          <Button
            variant="ghost"
            block
            label={t('screens.welcome.privacy.notice')}
            onPress={() => setNotice(true)}
          />
        </>
      }>
      <OnboardingHeading
        title={t('screens.welcome.privacy.title')}
        lead={t('screens.welcome.privacy.lead')}
      />
      <Section>
        {signals.map((signal) => (
          <Row
            key={signal}
            title={t(SIGNAL_COPY[signal].title)}
            meta={t(SIGNAL_COPY[signal].meta)}
            leading={<Avatar icon={SIGNAL_COPY[signal].glyph} />}
            trailing={
              <Switch
                label={t(SIGNAL_COPY[signal].title)}
                value={choices[signal]}
                disabled={disabled}
                onValueChange={(value) => onChange(signal, value)}
              />
            }
          />
        ))}
      </Section>
      {failed ? (
        <View className="mt-3" accessibilityLiveRegion="polite">
          <Notice inline tone="alert" title={t('screens.welcome.privacy.save-failed')} />
        </View>
      ) : null}
      <View className="mt-3 px-4">
        <Text variant="caption" tone="3">
          {t('screens.welcome.privacy.terms', { version: String(PRIVACY_NOTICE_VERSION) })}
        </Text>
      </View>
      <View className="min-h-6 flex-1" />
      <PrivacyNoticeDialog open={notice} onOpenChange={setNotice} />
    </OnboardingFrame>
  );
}
