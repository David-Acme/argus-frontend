import { useState } from 'react';
import { View } from 'react-native';
import type { PrivacyChoices, PrivacySignal } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PRIVACY_NOTICE_VERSION } from '@/features/privacy/constants/privacy';
import { PrivacyChoiceList } from '@/features/privacy/components/privacy-choice-list';
import { PrivacyNoticeDialog } from '@/features/privacy/components/privacy-notice-dialog';

export type ConsentFormVariant = 'onboarding' | 'review' | 'updated';

type ConsentFormProps = {
  variant: ConsentFormVariant;
  initial: PrivacyChoices;
  household?: PrivacyChoices;
  submitting?: boolean;
  header?: React.ReactNode;
  onAccept: (choices: PrivacyChoices) => void;
  onDecline: () => void;
};

const ESSENTIALS = ['essential-local', 'essential-face', 'essential-retention', 'essential-beta'] as const;

const TITLES = {
  onboarding: ['screens.privacy.consent.title', 'screens.privacy.consent.intro'],
  review: ['screens.privacy.consent.review-title', 'screens.privacy.consent.review-intro'],
  updated: ['screens.privacy.consent.updated-title', 'screens.privacy.consent.updated-intro'],
} as const satisfies Record<ConsentFormVariant, readonly [string, string]>;

export function ConsentForm({
  variant,
  initial,
  household,
  submitting,
  header,
  onAccept,
  onDecline,
}: ConsentFormProps) {
  const { t } = useTranslation();
  const [choices, setChoices] = useState<PrivacyChoices>(initial);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [title, intro] = TITLES[variant];

  const change = (signal: PrivacySignal, value: boolean) =>
    setChoices((previous) => ({ ...previous, [signal]: value }));

  return (
    <View className="w-full max-w-xl gap-6 self-center">
      {header}
      <View className="gap-3">
        <View className="bg-accent-soft size-14 items-center justify-center rounded-3xl">
          <Icon name="shield-check" className="text-accent-strong size-7" />
        </View>
        <Text variant="micro" className="font-semibold tracking-wide uppercase">
          {t('screens.privacy.consent.eyebrow')}
        </Text>
        <Text variant="title">{t(title)}</Text>
        <Text variant="body" className="text-foreground-secondary">
          {t(intro)}
        </Text>
      </View>

      <View className="bg-surface-secondary gap-2.5 rounded-2xl p-4">
        <Text variant="label">{t('screens.privacy.consent.essentials-title')}</Text>
        {ESSENTIALS.map((key) => (
          <View key={key} className="flex-row items-start gap-3">
            <Icon name="check" className="text-success mt-0.5 size-4" />
            <Text variant="caption" className="text-foreground-secondary flex-1">
              {t(`screens.privacy.consent.${key}`)}
            </Text>
          </View>
        ))}
        <Button variant="link" className="self-start px-0" onPress={() => setNoticeOpen(true)}>
          <Text className="text-accent-strong">{t('screens.privacy.consent.read-notice')}</Text>
        </Button>
      </View>

      <View className="gap-2">
        <View className="gap-0.5">
          <Text variant="headline">{t('screens.privacy.consent.choices-title')}</Text>
          <Text variant="caption">{t('screens.privacy.consent.choices-hint')}</Text>
        </View>
        <PrivacyChoiceList choices={choices} household={household} disabled={submitting} onChange={change} />
      </View>

      <View className="gap-3">
        <Text variant="caption" className="text-center">
          {t('screens.privacy.consent.accept-hint', { version: String(PRIVACY_NOTICE_VERSION) })}
        </Text>
        <Button size="lg" loading={submitting} onPress={() => onAccept(choices)}>
          <Text>{t('screens.privacy.consent.accept')}</Text>
        </Button>
        <Button variant="ghost" disabled={submitting} onPress={onDecline}>
          <Text>{t('screens.privacy.consent.decline')}</Text>
        </Button>
      </View>

      <PrivacyNoticeDialog open={noticeOpen} onOpenChange={setNoticeOpen} />
    </View>
  );
}
