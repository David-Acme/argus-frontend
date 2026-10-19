import { useState } from 'react';
import { View } from 'react-native';
import type { PrivacySignal } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { MODULE_IDS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { PRIVACY_SIGNAL_ICONS } from '@/features/privacy/constants/privacy';
import { usePrivacyDirectory } from '@/features/privacy/hooks/use-privacy-directory';
import { usePrivacySignals } from '@/features/privacy/hooks/use-privacy-signals';
import { cameraAudioHeldBy, watchmanReadiness, type WatchmanReadiness } from '@/features/privacy/model/privacy';
import { SignageDialog } from '@/features/privacy/components/signage-dialog';
import { VisitorAcknowledgementDialog } from '@/features/privacy/components/visitor-acknowledgement-dialog';
import { WatchmanAcknowledgementDialog } from '@/features/privacy/components/watchman-acknowledgement-dialog';

type HouseholdPrivacyPanelProps = {
  className?: string;
};

type SwitchRowProps = {
  icon: (typeof PRIVACY_SIGNAL_ICONS)[PrivacySignal] | 'users' | 'map-pin' | 'audio-lines';
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

const WATCHMAN_HINTS = {
  off: 'screens.privacy.household.watchman-hint',
  'audio-off': 'screens.privacy.household.watchman-audio-off',
  'audio-held': 'screens.privacy.household.watchman-audio-held',
  ready: 'screens.privacy.household.watchman-ready',
} as const satisfies Record<WatchmanReadiness, string>;

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
  const signals = usePrivacySignals(directory?.applicable);
  const { moduleActive } = useCapabilities();
  const [acknowledging, setAcknowledging] = useState(false);
  const [watchmanAsking, setWatchmanAsking] = useState(false);
  const [signageOpen, setSignageOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const surveillance = moduleActive(MODULE_IDS.surveillance);

  const enableVisitors = async () => {
    setSaving(true);
    const saved = await setSwitch('visitorRecognition', true, true);
    setSaving(false);
    if (saved) setAcknowledging(false);
  };

  const enableWatchman = async () => {
    setSaving(true);
    const saved = await setSwitch('watchman', true, true);
    setSaving(false);
    if (saved) setWatchmanAsking(false);
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
  const watchmanAcknowledged = directory.watchmanAcknowledgedAt;
  const readiness = watchmanReadiness(directory.household, directory.users);
  const watchmanHint =
    readiness === 'audio-held'
      ? t(WATCHMAN_HINTS[readiness], { count: String(audioHeld) })
      : t(WATCHMAN_HINTS[readiness]);

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
        {signals.map((signal) => (
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
        {surveillance ? (
          <SwitchRow
            icon="map-pin"
            label={t('screens.privacy.household.location')}
            hint={t('screens.privacy.household.location-hint')}
            value={directory.household.location !== false}
            onChange={(value) => void setSwitch('location', value)}
          />
        ) : null}
        {surveillance ? (
          <SwitchRow
            icon="audio-lines"
            label={t('screens.privacy.household.watchman')}
            hint={
              directory.household.watchman && watchmanAcknowledged
                ? `${watchmanHint} ${t('screens.privacy.household.watchman-acknowledged', {
                    date: dates.formatFullDate(new Date(watchmanAcknowledged * 1000)),
                  })}`
                : watchmanHint
            }
            value={directory.household.watchman}
            onChange={(value) => (value ? setWatchmanAsking(true) : void setSwitch('watchman', false))}
          />
        ) : null}
        {surveillance ? (
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
        ) : null}
      </View>
      {surveillance ? (
        <ListRow
          icon="shield-check"
          title={t('screens.privacy.household.signage')}
          subtitle={t('screens.privacy.household.signage-hint')}
          chevron
          onPress={() => setSignageOpen(true)}
        />
      ) : null}
      <WatchmanAcknowledgementDialog
        open={watchmanAsking}
        saving={saving}
        onOpenChange={setWatchmanAsking}
        onConfirm={() => void enableWatchman()}
      />
      <SignageDialog
        open={signageOpen}
        audio={directory.household.watchman}
        onOpenChange={setSignageOpen}
      />
      <VisitorAcknowledgementDialog
        open={acknowledging}
        saving={saving}
        onOpenChange={setAcknowledging}
        onConfirm={() => void enableVisitors()}
      />
    </Panel>
  );
}
