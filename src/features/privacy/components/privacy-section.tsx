import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { PrivacyChoiceList } from '@/features/privacy/components/privacy-choice-list';
import { PrivacyNoticeDialog } from '@/features/privacy/components/privacy-notice-dialog';
import { usePrivacy } from '@/features/privacy/hooks/use-privacy';

type PrivacySectionProps = {
  className?: string;
};

export function PrivacySection({ className }: PrivacySectionProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const { me, status, setChoice, reload } = usePrivacy();
  const [noticeOpen, setNoticeOpen] = useState(false);

  const header = (
    <View className="flex-row items-center gap-3">
      <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
        <Icon name="shield-check" className="text-foreground-secondary size-5" />
      </View>
      <View className="min-w-0 flex-1">
        <Text variant="headline">{t('screens.privacy.title')}</Text>
        <Text variant="caption">{t('screens.privacy.subtitle')}</Text>
      </View>
    </View>
  );

  return (
    <Panel className={cn('gap-3 p-5', className)}>
      {header}
      {me ? (
        <>
          <View className="px-1">
            <PrivacyChoiceList
              choices={me.choices}
              household={me.household}
              onChange={(signal, value) => void setChoice(signal, value)}
            />
          </View>
          <Text variant="caption" className="px-1">
            {me.decided && me.decidedAt
              ? t('screens.privacy.section.accepted', {
                  version: String(me.noticeVersion),
                  date: dates.formatFullDate(new Date((me.updatedAt ?? me.decidedAt) * 1000)),
                })
              : t('screens.privacy.section.not-accepted')}
          </Text>
        </>
      ) : status === 'failed' ? (
        <ListRow icon="rotate-ccw" title={t('screens.privacy.section.unavailable')} onPress={() => void reload()} />
      ) : (
        <Text variant="caption" className="px-1 py-3">
          {t('screens.privacy.section.loading')}
        </Text>
      )}

      <View className="bg-surface-secondary dark:bg-card-secondary gap-1 rounded-2xl p-4">
        <Text variant="label">{t('screens.privacy.section.terms-title')}</Text>
        <Text variant="caption">{t('screens.privacy.section.terms-summary')}</Text>
        <Button variant="link" className="self-start px-0" onPress={() => setNoticeOpen(true)}>
          <Text className="text-accent-strong">{t('screens.privacy.consent.read-notice')}</Text>
        </Button>
      </View>

      <PrivacyNoticeDialog open={noticeOpen} onOpenChange={setNoticeOpen} />
    </Panel>
  );
}
