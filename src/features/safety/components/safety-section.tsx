import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { PanicButton } from '@/features/safety/components/panic-button';
import { PinSetupDialog } from '@/features/safety/components/pin-setup-dialog';
import { useSafety } from '@/features/safety/hooks/use-safety';

type SafetySectionProps = {
  className?: string;
};

export function SafetySection({ className }: SafetySectionProps) {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.user?.role ?? 'guest');
  const { status, setDuressEnabled, savePins, removePins } = useSafety();
  const [pinsOpen, setPinsOpen] = useState(false);
  const owner = role === 'owner';
  const disarms = role === 'owner' || role === 'resident';

  return (
    <Panel className={cn('gap-4 p-5', className)}>
      <View className="flex-row items-center gap-3">
        <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
          <Icon name="siren" className="text-foreground-secondary size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="headline">{t('screens.safety.title')}</Text>
          <Text variant="caption">{t('screens.safety.subtitle')}</Text>
        </View>
      </View>

      <PanicButton />

      {owner && status ? (
        <ToggleRow
          label={t('screens.safety.owner.toggle')}
          hint={t('screens.safety.owner.hint')}
          value={status.duressEnabled}
          onChange={(next) => void setDuressEnabled(next)}
        />
      ) : null}

      {disarms && status?.duressEnabled ? (
        <View className="gap-1">
          <ListRow
            icon="key-round"
            title={status.hasPin ? t('screens.safety.pins.change') : t('screens.safety.pins.create')}
            subtitle={status.hasPin ? t('screens.safety.pins.set') : t('screens.safety.pins.unset')}
            onPress={() => setPinsOpen(true)}
          />
          {status.hasPin ? (
            <ListRow
              icon="trash"
              title={t('screens.safety.pins.remove')}
              destructive
              onPress={() => void removePins()}
            />
          ) : null}
        </View>
      ) : null}

      <PinSetupDialog open={pinsOpen} onOpenChange={setPinsOpen} onSave={savePins} />
    </Panel>
  );
}
