import { View } from 'react-native';
import type { GuardEnvironment, GuardMode, IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { GuardModePicker } from '@/features/security/components/guard-mode-picker';
import { GUARD_MODE_ICONS } from '@/features/security/constants';
import { sharedMode } from '@/features/security/model/environments';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type SecurityHeroProps = {
  environments: readonly GuardEnvironment[];
  ongoing: number;
  activeGuests: number;
  pendingReviews?: number;
  pendingAll: GuardMode | null;
  onSetAll?: (mode: GuardMode) => void;
};

type GuardStatProps = {
  icon: IconName;
  value: number;
  label: string;
  highlight: boolean;
};

function GuardStat({ icon, value, label, highlight }: GuardStatProps) {
  return (
    <View className="bg-surface-secondary min-w-0 flex-1 gap-1 rounded-2xl px-3 py-3">
      <View className="flex-row items-center gap-1.5">
        <Icon name={icon} className={cn('size-4', highlight ? 'text-accent-strong' : 'text-muted-foreground')} />
        <Text variant="headline">{String(value)}</Text>
      </View>
      <Text variant="micro" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SecurityHero({
  environments,
  ongoing,
  activeGuests,
  pendingReviews,
  pendingAll,
  onSetAll,
}: SecurityHeroProps) {
  const { t } = useTranslation();
  const shared = sharedMode(environments);
  const effective = environments.map((environment) => environment.effectiveMode);
  const headline: GuardMode | null =
    effective.length > 0 && effective.every((mode) => mode === effective[0]) ? (effective[0] ?? null) : null;
  const armed = effective.filter((mode) => mode === 'armed').length;
  const several = environments.length > 1;
  const [only] = environments;

  return (
    <Panel className="gap-4 sm:p-5">
      <View className="flex-row items-start gap-4">
        <View className="bg-interactive size-14 items-center justify-center rounded-2xl">
          <Icon
            name={headline ? GUARD_MODE_ICONS[headline] : 'shield'}
            className="text-foreground-on-interactive size-7"
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text variant="caption">
            {several
              ? t('screens.security.status.summary-many', { count: String(environments.length) })
              : t('screens.security.status.now')}
          </Text>
          <Text variant="title" numberOfLines={1}>
            {headline ? t(`screens.security.mode.${headline}`) : environments.length > 0 ? t('screens.security.mode.mixed') : '—'}
          </Text>
          <Text variant="body" className="text-foreground-secondary">
            {headline && !several
              ? t(`screens.security.mode.${headline}-detail`)
              : armed > 0
                ? t('screens.security.status.summary-alert', { count: String(armed) })
                : only && !several
                  ? only.name
                  : t('screens.security.mode.note')}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <GuardStat
          icon="triangle-alert"
          value={ongoing}
          label={t('screens.security.status.active')}
          highlight={ongoing > 0}
        />
        <GuardStat
          icon="user-check"
          value={activeGuests}
          label={t('screens.security.status.guests')}
          highlight={activeGuests > 0}
        />
        {pendingReviews === undefined ? null : (
          <GuardStat
            icon="check-circle"
            value={pendingReviews}
            label={t('screens.security.status.pending')}
            highlight={pendingReviews > 0}
          />
        )}
      </View>
      {onSetAll && several ? (
        <View className="gap-2">
          <View className="gap-0.5">
            <Text variant="label">{t('screens.security.mode.all')}</Text>
            <Text variant="caption">{t('screens.security.mode.all-hint')}</Text>
          </View>
          <GuardModePicker
            variant="chips"
            selected={shared}
            pending={pendingAll}
            onSelect={onSetAll}
            accessibilityLabel={t('screens.security.mode.all')}
          />
        </View>
      ) : (
        <Text variant="caption">{t('screens.security.mode.note')}</Text>
      )}
    </Panel>
  );
}
