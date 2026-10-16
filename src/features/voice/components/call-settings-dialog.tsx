import { View } from 'react-native';
import type { CallAudioDevice, CallAudioKind } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { OptionRow } from '@/shared/components/ui/option-row';
import { PermissionList } from '@/shared/components/ui/permission-list';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useDevicePermissions } from '@/shared/hooks/use-device-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useCallAudio } from '@/features/voice/hooks/use-call-audio';
import { callAudioIcon, callAudioLabel, groupCallAudio } from '@/features/voice/model/call-audio';

type CallSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  muted: boolean;
  onToggleMute: () => void;
};

type DeviceSectionProps = {
  title: string;
  devices: readonly CallAudioDevice[];
  onSelect: (device: CallAudioDevice) => void;
  kindLabel: (kind: CallAudioKind) => string;
};

function DeviceSection({ title, devices, onSelect, kindLabel }: DeviceSectionProps) {
  if (devices.length === 0) return null;
  return (
    <View className="gap-1">
      <Text variant="micro" className="text-foreground-secondary font-semibold tracking-wide uppercase">
        {title}
      </Text>
      {devices.map((device) => (
        <OptionRow
          key={`${device.direction}-${device.id}`}
          density="compact"
          selected={device.active}
          option={{ value: device.id, label: callAudioLabel(device, kindLabel), icon: callAudioIcon(device.kind) }}
          onSelect={() => onSelect(device)}
        />
      ))}
    </View>
  );
}

export function CallSettingsDialog({ open, onOpenChange, muted, onToggleMute }: CallSettingsDialogProps) {
  const { t } = useTranslation();
  const audio = useCallAudio(open);
  const { permissions, request } = useDevicePermissions('call');
  const groups = groupCallAudio(audio.devices);
  const kindLabel = (kind: CallAudioKind) => t(`screens.voice.device-${kind}`);
  const empty = audio.devices.length === 0;

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.voice.settings-title')}
      closeLabel={t('screens.voice.settings-close')}>
      <View className="gap-5">
        <View className="gap-2">
          <Text variant="label">{t('screens.voice.settings-audio')}</Text>
          {empty ? (
            <Text variant="caption" className="text-foreground-secondary">
              {t('screens.voice.settings-no-devices')}
            </Text>
          ) : (
            <>
              <DeviceSection title={t('screens.voice.settings-route')} devices={groups.routes} onSelect={audio.select} kindLabel={kindLabel} />
              <DeviceSection title={t('screens.voice.settings-input')} devices={groups.inputs} onSelect={audio.select} kindLabel={kindLabel} />
              <DeviceSection title={t('screens.voice.settings-output')} devices={groups.outputs} onSelect={audio.select} kindLabel={kindLabel} />
              {groups.routes.length > 0 ? (
                <Text variant="caption" className="text-foreground-secondary">
                  {t('screens.voice.settings-audio-hint')}
                </Text>
              ) : null}
            </>
          )}
          {audio.support.routePicker ? (
            <Button variant="outline" size="sm" onPress={audio.showRoutePicker}>
              <Text>{t('screens.voice.settings-other-devices')}</Text>
            </Button>
          ) : null}
          <ToggleRow label={t('screens.voice.mute')} value={muted} onChange={onToggleMute} />
        </View>
        {permissions.length > 0 ? (
          <View className="gap-2">
            <Text variant="label">{t('screens.voice.settings-permissions')}</Text>
            <PermissionList permissions={permissions} onRequest={request} density="compact" />
          </View>
        ) : null}
      </View>
    </AdaptiveDialog>
  );
}
