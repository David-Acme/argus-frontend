import { useState } from 'react';
import { View } from 'react-native';
import type { VoiceprintStatus } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceprint } from '../hooks/use-voiceprint';
import { VoiceEnrollmentDialog } from './voice-enrollment-dialog';
import { VoiceTestDialog } from './voice-test-dialog';

type VoiceprintDialog = 'enroll' | 'test' | null;

type VoiceprintPrimaryAction = {
  label: string;
  icon: 'mic' | 'play';
  onPress: () => void;
};

type VoiceprintActionsProps = {
  primary: VoiceprintPrimaryAction | null;
  removing: boolean;
  onRemove: () => void;
};

function VoiceprintActions({ primary, removing, onRemove }: VoiceprintActionsProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-2 px-2 pb-2">
      {primary ? (
        <Button variant="outline" size="sm" onPress={primary.onPress} disabled={removing}>
          <Icon name={primary.icon} />
          <Text>{primary.label}</Text>
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onPress={onRemove} loading={removing}>
        <Icon name="trash" className="text-error-strong" />
        <Text className="text-error-strong">{t('screens.voiceprint.remove')}</Text>
      </Button>
    </View>
  );
}

function enrolledDate(status: VoiceprintStatus): Date | null {
  return status.enrolledAt ? new Date(status.enrolledAt * 1000) : null;
}

export function VoiceprintPanel() {
  const { t } = useTranslation();
  const { formatFullDate } = useDateFormatter();
  const { voiceprint, status, recordable, pending, reload, apply, remove } = useVoiceprint();
  const [dialog, setDialog] = useState<VoiceprintDialog>(null);
  const since = voiceprint ? enrolledDate(voiceprint) : null;
  const canRecord = recordable !== false;

  const open = (next: VoiceprintDialog) => () => setDialog(next);
  const close = () => setDialog(null);
  const removeVoice = () => void remove();

  const body = !voiceprint ? (
    <ListRow
      icon="mic"
      title={status === 'failed' ? t('screens.voiceprint.load-failed') : t('screens.voiceprint.loading')}
      trailing={status === 'failed' ? <Icon name="refresh-cw" className="text-muted-foreground size-4" /> : undefined}
      onPress={status === 'failed' ? () => void reload() : undefined}
    />
  ) : !voiceprint.available ? (
    <ListRow
      icon="mic-off"
      title={t('screens.voiceprint.unavailable-title')}
      subtitle={t('screens.voiceprint.unavailable-hint')}
    />
  ) : voiceprint.enrolled && !voiceprint.stale ? (
    <>
      <ListRow
        icon="check-circle"
        title={t('screens.voiceprint.enrolled-title')}
        subtitle={since ? t('screens.voiceprint.enrolled-hint', { date: formatFullDate(since) }) : undefined}
      />
      <VoiceprintActions
        primary={canRecord ? { label: t('screens.voiceprint.test'), icon: 'play', onPress: open('test') } : null}
        removing={pending}
        onRemove={removeVoice}
      />
    </>
  ) : !canRecord ? (
    <ListRow
      icon="mic-off"
      title={t('screens.voiceprint.unsupported-title')}
      subtitle={t('screens.voiceprint.unsupported-hint')}
    />
  ) : voiceprint.stale ? (
    <>
      <ListRow
        icon="triangle-alert"
        title={t('screens.voiceprint.stale-title')}
        subtitle={t('screens.voiceprint.stale-hint')}
      />
      <VoiceprintActions
        primary={{ label: t('screens.voiceprint.redo'), icon: 'mic', onPress: open('enroll') }}
        removing={pending}
        onRemove={removeVoice}
      />
    </>
  ) : (
    <ListRow
      icon="mic"
      title={t('screens.voiceprint.not-enrolled-title')}
      subtitle={t('screens.voiceprint.not-enrolled-hint')}
      chevron
      onPress={open('enroll')}
    />
  );

  return (
    <>
      {body}
      <Text variant="caption" className="px-3 pb-2 pt-1">
        {t('screens.voiceprint.privacy-note')}
      </Text>
      {dialog === 'enroll' ? <VoiceEnrollmentDialog onClose={close} onEnrolled={apply} /> : null}
      {dialog === 'test' ? <VoiceTestDialog onClose={close} /> : null}
    </>
  );
}
