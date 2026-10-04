import { View } from 'react-native';
import type { IconName, VoiceActionRecord, VoiceActionStatus } from '@/core/types';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { CALL_ACTIONS_VISIBLE } from '@/features/voice/constants/voice';
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
  const { t, tk } = useTranslation();
  const visible = actions.slice(-CALL_ACTIONS_VISIBLE);

  const labelOf = (action: VoiceActionRecord): string => {
    if (action.name === 'app.show_camera') {
      const camera = typeof action.arguments.camera === 'string' ? action.arguments.camera.trim() : '';
      return camera
        ? t('screens.voice.actions.show-camera', { name: camera })
        : t('screens.voice.actions.show-camera-any');
    }
    if (action.name === 'app.open') {
      const screen = String(action.arguments.screen ?? '');
      const key = `screens.voice.actions.screens.${screen}`;
      return t('screens.voice.actions.open', { screen: tk(key) === key ? screen : tk(key) });
    }
    const mode = String(action.arguments.mode ?? '');
    const key = `screens.security.mode.${mode}`;
    const label = t('screens.voice.actions.set-guard-mode', { mode: tk(key) === key ? mode : tk(key) });
    const place = typeof action.arguments.environment === 'string' ? action.arguments.environment.trim() : '';
    return place ? `${place} · ${label}` : label;
  };

  if (visible.length === 0) return null;

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={t('screens.voice.actions.list')}
      accessibilityLiveRegion="polite"
      className="flex-row flex-wrap justify-center gap-2">
      {visible.map((action) => {
        const label = labelOf(action);
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
