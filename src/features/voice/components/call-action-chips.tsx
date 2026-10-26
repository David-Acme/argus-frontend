import { View } from 'react-native';
import type { IconName, VoiceActionRecord, VoiceActionStatus } from '@/core/types';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { CALL_ACTIONS_VISIBLE } from '@/features/voice/constants/voice';
import { voiceActionLabel } from '@/features/voice/model/voice-action-label';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CallActionChipsProps = {
  actions: readonly VoiceActionRecord[];
};

const ACTION_ICONS: Readonly<Record<VoiceActionRecord['name'], IconName>> = {
  'app.show_camera': 'video',
  'app.open': 'arrow-up-right',
  'app.set_guard_mode': 'shield',
};

const STATUS_ICONS: Readonly<Record<Exclude<VoiceActionStatus, 'pending'>, IconName>> = {
  done: 'check',
  failed: 'x',
};

const STATUS_TONES: Readonly<Record<VoiceActionStatus, string>> = {
  pending: 'text-foreground-secondary',
  done: 'text-success',
  failed: 'text-error-strong',
};

export function CallActionChips({ actions }: CallActionChipsProps) {
  const copy = useTranslation();
  const { t } = copy;
  const visible = actions.slice(-CALL_ACTIONS_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={t('screens.voice.actions.list')}
      accessibilityLiveRegion="polite"
      className="flex-row flex-wrap justify-center gap-2">
      {visible.map((action) => {
        const label = voiceActionLabel(action, copy);
        const status = t(`screens.voice.actions.${action.status}`);
        return (
          <View
            key={action.id}
            accessible
            accessibilityLabel={action.detail ? `${label}, ${status}: ${action.detail}` : `${label}, ${status}`}>
            <StatusBadge
              label={label}
              icon={action.status === 'pending' ? ACTION_ICONS[action.name] : STATUS_ICONS[action.status]}
              iconClassName={STATUS_TONES[action.status]}
              textClassName={cn(action.status === 'failed' && STATUS_TONES.failed)}
              surface="card"
            />
          </View>
        );
      })}
    </View>
  );
}
