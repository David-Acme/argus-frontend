import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { IS_ANDROID, IS_IOS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { useBeaconPlan } from '@/features/proximity/hooks/use-beacon-controller';
import { useProximityMe } from '@/features/proximity/hooks/use-proximity-me';
import { BEACON_PLATFORM_HINT, BEACON_REASON_LABEL } from '@/features/proximity/model/proximity';

type ProximitySectionProps = {
  className?: string;
};

const PLATFORM_HINT = IS_ANDROID
  ? BEACON_PLATFORM_HINT.android
  : IS_IOS
    ? BEACON_PLATFORM_HINT.ios
    : BEACON_PLATFORM_HINT.none;

export function ProximitySection({ className }: ProximitySectionProps) {
  const { t } = useTranslation();
  const { me, setBle, pending, enabled } = useProximityMe();
  const plan = useBeaconPlan(me);
  const phone = IS_ANDROID || IS_IOS;

  if (!enabled) return null;

  return (
    <Panel className={cn('gap-3 p-5', className)}>
      <View className="flex-row items-center gap-3">
        <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
          <Icon name="bluetooth" className="text-foreground-secondary size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="headline">{t('screens.proximity.ble.title')}</Text>
          <Text variant="caption">{t('screens.proximity.ble.subtitle')}</Text>
        </View>
      </View>
      <View className="px-1">
        <ToggleRow
          label={t('screens.proximity.ble.toggle')}
          hint={t(PLATFORM_HINT)}
          value={me?.ble.enabled ?? false}
          disabled={!phone || pending || me == null || !me.located}
          onChange={(value) => void setBle(value)}
        />
      </View>
      {me?.ble.enabled ? (
        <StatusBadge
          icon={plan.advertise ? 'bluetooth' : 'pause'}
          label={t(BEACON_REASON_LABEL[plan.reason])}
          iconClassName={plan.advertise ? 'text-success' : 'text-muted-foreground'}
        />
      ) : null}
      {me && !me.located ? (
        <Text variant="caption" className="px-1">
          {t('screens.proximity.ble.not-located-hint')}
        </Text>
      ) : null}
      {me?.ble.enabled && me.ble.receivers === 0 ? (
        <Text variant="caption" className="bg-surface-secondary dark:bg-card-secondary rounded-2xl px-3 py-2.5">
          {t('screens.proximity.ble.no-receivers')}
        </Text>
      ) : null}
    </Panel>
  );
}
