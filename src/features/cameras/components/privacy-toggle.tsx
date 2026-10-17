import { ActivityIndicator, View } from 'react-native';
import { privacyStateOf } from '@/features/cameras/model/camera-device';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Switch } from '@/shared/components/ui/switch';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type PrivacyToggleProps = {
  label: string;
  hint?: string;
  value: boolean | null | undefined;
  busy?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export function PrivacyToggle({ label, hint, value, busy = false, disabled = false, onChange }: PrivacyToggleProps) {
  const { t } = useTranslation();
  const state = privacyStateOf(value);

  return (
    <View className="min-h-11 flex-row items-center justify-between gap-3 py-1.5">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="body">{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      {busy ? (
        <View className="w-12 items-center">
          <ActivityIndicator accessibilityLabel={label} />
        </View>
      ) : state === 'unknown' ? (
        <StatusBadge label={t('screens.cameras.privacy-unknown')} icon="eye-off" />
      ) : (
        <Switch value={state === 'on'} accessibilityLabel={label} disabled={disabled} onChange={onChange} />
      )}
    </View>
  );
}
