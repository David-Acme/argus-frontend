import { View } from 'react-native';
import type { GuardModeState, IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { GUARD_MODE_ICONS, SITE_PROFILE_ICONS } from '@/features/security/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { Panel } from '@/shared/components/ui/panel';

type GuardStatusHeroProps = {
  state: GuardModeState | null;
  ongoing: number;
  ongoingLabel: string;
  activeGuests: number;
  pendingReviews: number;
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
        <Icon
          name={icon}
          className={cn('size-4', highlight ? 'text-accent-strong' : 'text-muted-foreground')}
        />
        <Text variant="headline">{String(value)}</Text>
      </View>
      <Text variant="micro" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function GuardStatusHero({
  state,
  ongoing,
  ongoingLabel,
  activeGuests,
  pendingReviews,
}: GuardStatusHeroProps) {
  const { t } = useTranslation();
  const mode = state?.effectiveMode ?? null;
  const occupancy = state?.occupancy;
  const schedule =
    occupancy === 'closed'
      ? t('screens.security.occupancy.closed', {
          mode: t(`screens.security.mode.${state?.effectiveMode ?? 'home'}`),
        })
      : occupancy === 'open' || occupancy === 'staffed' || occupancy === 'asleep'
        ? t(`screens.security.occupancy.${occupancy}`)
        : null;

  return (
    <Panel className="gap-4 sm:p-5">
      <View className="flex-row items-start gap-4">
        <View className="bg-interactive size-14 items-center justify-center rounded-2xl">
          <Icon
            name={mode ? GUARD_MODE_ICONS[mode] : 'shield'}
            className="text-foreground-on-interactive size-7"
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="caption">{t('screens.security.status.now')}</Text>
            {state?.profile ? (
              <View className="bg-surface-secondary flex-row items-center gap-1 rounded-full px-2 py-0.5">
                <Icon name={SITE_PROFILE_ICONS[state.profile]} className="text-foreground-secondary size-3" />
                <Text variant="micro" className="text-foreground-secondary font-semibold">
                  {t(`screens.security.site.profiles.${state.profile}`)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="title" numberOfLines={1}>
            {mode ? t(`screens.security.mode.${mode}`) : '—'}
          </Text>
          <Text variant="body" className="text-foreground-secondary">
            {mode
              ? t(`screens.security.mode.${mode}-detail`)
              : t('screens.security.status.unknown')}
          </Text>
        </View>
      </View>
      {schedule ? (
        <View className="bg-accent/10 flex-row items-center gap-2 rounded-xl px-3 py-2">
          <Icon name="clock" className="text-accent-strong size-4" />
          <Text variant="caption" className="text-foreground flex-1">
            {schedule}
          </Text>
        </View>
      ) : null}
      <View className="flex-row gap-2">
        <GuardStat
          icon="triangle-alert"
          value={ongoing}
          label={ongoingLabel}
          highlight={ongoing > 0}
        />
        <GuardStat
          icon="user-check"
          value={activeGuests}
          label={t('screens.security.status.guests')}
          highlight={activeGuests > 0}
        />
        <GuardStat
          icon="check-circle"
          value={pendingReviews}
          label={t('screens.security.status.pending')}
          highlight={pendingReviews > 0}
        />
      </View>
      <Text variant="caption">{t('screens.security.mode.note')}</Text>
    </Panel>
  );
}
