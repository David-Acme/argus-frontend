import { useState } from 'react';
import { View } from 'react-native';
import type { PrivacySignal } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { PRIVACY_SIGNALS, PRIVACY_SIGNAL_ICONS } from '@/features/privacy/constants/privacy';
import { usePrivacyDirectory } from '@/features/privacy/hooks/use-privacy-directory';
import { cameraAudioHeldBy } from '@/features/privacy/model/privacy';
import { VisitorAcknowledgementDialog } from '@/features/privacy/components/visitor-acknowledgement-dialog';

type HouseholdPrivacyPanelProps = {
  className?: string;
};

type SwitchRowProps = {
  icon: (typeof PRIVACY_SIGNAL_ICONS)[PrivacySignal] | 'users';
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function SwitchRow({ icon, label, hint, value, onChange }: SwitchRowProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="bg-surface-secondary mt-2 size-9 items-center justify-center rounded-full">
        <Icon name={icon} className="text-foreground-secondary size-4" />
      </View>
      <View className="min-w-0 flex-1">
        <ToggleRow label={label} hint={hint} value={value} onChange={onChange} />
      </View>
    </View>
  );
}

export function HouseholdPrivacyPanel({ className }: HouseholdPrivacyPanelProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const { directory, status, setSwitch, reload } = usePrivacyDirectory();
  const [acknowledging, setAcknowledging] = useState(false);
  const [saving, setSaving] = useState(false);

  const enableVisitors = async () => {
    setSaving(true);
    const saved = await setSwitch('visitorRecognition', true, true);
    setSaving(false);
    if (saved) setAcknowledging(false);
  };

  if (!directory) {
    return (
      <Panel className={cn('gap-3 p-4', className)}>
        {status === 'failed' ? (
          <ListRow icon="rotate-ccw" title={t('screens.privacy.section.unavailable')} onPress={() => void reload()} />
        ) : (
          <Text variant="caption" className="px-1 py-3">
            {t('screens.privacy.section.loading')}
          </Text>
        )}
      </Panel>
    );
  }

  const pending = directory.users.filter((user) => !user.decided || !user.current).length;
  const audioHeld = cameraAudioHeldBy(directory.users, directory.household);
  const visitorsAcknowledged = directory.visitorAcknowledgedAt;

  return (
    <Panel className={cn('gap-2 p-4', className)}>
      <View className="flex-row items-center justify-between gap-2 px-1">
        <Text variant="caption" className="min-w-0 flex-1">
          {t('screens.privacy.household.hint')}
        </Text>
        <View className="bg-surface-secondary rounded-full px-2.5 py-1">
          <Text variant="micro" className="text-foreground-secondary font-semibold">
            {pending > 0
              ? t('screens.privacy.household.pending', { count: String(pending) })
              : t('screens.privacy.household.all-decided')}
          </Text>
        </View>
      </View>
      <View className="gap-1 px-1">
        {PRIVACY_SIGNALS.map((signal) => (
          <SwitchRow
            key={signal}
            icon={PRIVACY_SIGNAL_ICONS[signal]}
            label={t(`screens.privacy.household.signal.${signal}`)}
            hint={
              signal === 'cameraAudio' && directory.household.cameraAudio
                ? audioHeld > 0
                  ? t('screens.privacy.household.audio-held', { count: String(audioHeld) })
                  : t('screens.privacy.household.audio-on')
                : t(`screens.privacy.household.signal-hint.${signal}`)
            }
            value={directory.household[signal]}
            onChange={(value) => void setSwitch(signal, value)}
          />
        ))}
        <SwitchRow
          icon="users"
          label={t('screens.privacy.household.visitors')}
          hint={
            directory.household.visitorRecognition && visitorsAcknowledged
              ? `${t('screens.privacy.household.visitors-hint')} ${t(
                  'screens.privacy.household.visitors-acknowledged',
                  { date: dates.formatFullDate(new Date(visitorsAcknowledged * 1000)) }
                )}`
              : t('screens.privacy.household.visitors-hint')
          }
          value={directory.household.visitorRecognition}
          onChange={(value) =>
            value ? setAcknowledging(true) : void setSwitch('visitorRecognition', false)
          }
        />
      </View>
      <VisitorAcknowledgementDialog
        open={acknowledging}
        saving={saving}
        onOpenChange={setAcknowledging}
        onConfirm={() => void enableVisitors()}
      />
    </Panel>
  );
}
