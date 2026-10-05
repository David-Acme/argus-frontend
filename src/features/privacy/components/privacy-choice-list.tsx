import { View } from 'react-native';
import type { PrivacyChoices, PrivacySignal } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PRIVACY_SIGNALS, PRIVACY_SIGNAL_ICONS } from '@/features/privacy/constants/privacy';
import { blockedByHousehold } from '@/features/privacy/model/privacy';

type PrivacyChoiceListProps = {
  choices: PrivacyChoices;
  household?: PrivacyChoices;
  disabled?: boolean;
  onChange: (signal: PrivacySignal, value: boolean) => void;
};

export function PrivacyChoiceList({ choices, household, disabled, onChange }: PrivacyChoiceListProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      {PRIVACY_SIGNALS.map((signal) => {
        const blocked = household ? blockedByHousehold(household, signal) : false;
        const hint = t(`screens.privacy.signal-hint.${signal}`);
        return (
          <View key={signal} className="flex-row items-start gap-3">
            <View className="bg-surface-secondary mt-2 size-9 items-center justify-center rounded-full">
              <Icon name={PRIVACY_SIGNAL_ICONS[signal]} className="text-foreground-secondary size-4" />
            </View>
            <View className="min-w-0 flex-1">
              <ToggleRow
                label={t(`screens.privacy.signal.${signal}`)}
                hint={blocked ? `${hint} ${t('screens.privacy.household-off')}` : hint}
                value={choices[signal] && !blocked}
                disabled={disabled || blocked}
                onChange={(value) => onChange(signal, value)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
