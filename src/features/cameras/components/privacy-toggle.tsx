import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { privacyStateOf } from '@/shared/libs/camera-privacy';
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
  onRecheck?: () => Promise<void>;
  onChange: (next: boolean) => void;
};

export function PrivacyToggle({
  label,
  hint,
  value,
  busy = false,
  disabled = false,
  onRecheck,
  onChange,
}: PrivacyToggleProps) {
  const { t } = useTranslation();
  const state = privacyStateOf(value);
  const [rechecking, setRechecking] = useState(false);
  const [asked, setAsked] = useState(false);
  const [askedState, setAskedState] = useState(state);

  if (askedState !== state) {
    setAskedState(state);
    if (state !== 'unknown') setAsked(false);
  }

  const recheck = useCallback(async () => {
    if (!onRecheck) return;
    setRechecking(true);
    setAsked(true);
    await onRecheck().catch(() => undefined);
    setRechecking(false);
  }, [onRecheck]);

  const unknownHint = state === 'unknown' && asked && !rechecking;

  return (
    <View className="min-h-11 gap-1 py-1.5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="body">{label}</Text>
          {hint ? <Text variant="caption">{hint}</Text> : null}
        </View>
        {busy || rechecking ? (
          <View className="w-12 items-center">
            <ActivityIndicator accessibilityLabel={label} />
          </View>
        ) : state === 'unknown' ? (
          <View className="flex-row items-center gap-1">
            <StatusBadge label={t('screens.cameras.privacy-unknown')} icon="eye-off" />
            {onRecheck ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => void recheck()}
                className="rounded-full px-2.5 py-1.5 active:opacity-70">
                <Text variant="label" className="text-accent-strong">
                  {t('screens.cameras.privacy-recheck')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Switch value={state === 'on'} accessibilityLabel={label} disabled={disabled} onChange={onChange} />
        )}
      </View>
      {unknownHint ? <Text variant="caption">{t('screens.cameras.privacy-unknown-hint')}</Text> : null}
    </View>
  );
}
