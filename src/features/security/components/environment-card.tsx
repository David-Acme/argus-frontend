import { Platform, Pressable, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment, GuardHoursKind } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { ENVIRONMENT_KIND_ICONS, GUARD_MODE_ICONS, WEEK_DAY_KEYS } from '@/features/security/constants';
import { HOURS_BY_KIND } from '@/features/security/model/environment-presets';
import { postureKey } from '@/features/security/model/environments';
import { parseHours, summarizeHours } from '@/features/security/model/hours';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type EnvironmentCardProps = {
  environment: GuardEnvironment;
  cameras: readonly ICameraCacheRow[];
  ongoing: number;
  onOpen: (environment: GuardEnvironment) => void;
};

const CAMERA_NAMES_SHOWN = 3;

const hover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

export function EnvironmentCard({ environment, cameras, ongoing, onOpen }: EnvironmentCardProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const effective = environment.effectiveMode;
  const alert = effective === 'armed' || effective === 'away';
  const hours = HOURS_BY_KIND[environment.kind]
    .map((kind: GuardHoursKind) => {
      const windows = parseHours(environment[kind]);
      if (windows.length === 0) return null;
      return `${t(`screens.security.site.hours.${kind}`)}: ${summarizeHours(windows, {
        day: (day) => t(`screens.security.site.days.${WEEK_DAY_KEYS[day] ?? 'mon'}`),
        everyDay: t('screens.security.site.every-day'),
      })}`;
    })
    .filter((line): line is string => line !== null);
  const names = cameras.slice(0, CAMERA_NAMES_SHOWN).map((camera) => camera.name);
  const hidden = cameras.length - names.length;
  const cameraLine =
    cameras.length === 0
      ? t('screens.security.environments.no-cameras')
      : [
          names.join(', '),
          hidden > 0 ? t('screens.security.environments.more-cameras', { count: String(hidden) }) : null,
        ]
          .filter((part): part is string => part !== null)
          .join(' ');
  const posture = t(`screens.security.occupancy.${postureKey(environment)}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('screens.security.environments.open', { name: environment.name })}
      accessibilityHint={`${t(`screens.security.mode.${effective}`)}, ${posture}`}
      onPress={() => onOpen(environment)}
      className={cn(
        'bg-card dark:bg-card-secondary border-border-subtle flex-1 gap-3 rounded-3xl border p-4 active:opacity-80',
        !isCompact && 'min-h-[168px]',
        hover
      )}>
      <View className="flex-row items-start gap-3">
        <View className="bg-surface-secondary size-11 items-center justify-center rounded-2xl">
          <Icon name={ENVIRONMENT_KIND_ICONS[environment.kind]} className="text-foreground size-5" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="subhead" numberOfLines={1}>
            {environment.name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {environment.isDefault
              ? `${t(`screens.security.environments.kinds.${environment.kind}`)} · ${t('screens.security.environments.default')}`
              : t(`screens.security.environments.kinds.${environment.kind}`)}
          </Text>
        </View>
        <Icon name="chevron-right" className="text-muted-foreground mt-1 size-4" />
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <View
          className={cn(
            'flex-row items-center gap-1.5 rounded-full px-2.5 py-1',
            alert ? 'bg-interactive' : 'bg-surface-secondary'
          )}>
          <Icon
            name={GUARD_MODE_ICONS[effective]}
            className={cn('size-3.5', alert ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
          />
          <Text
            variant="micro"
            className={cn('font-semibold', alert ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}>
            {t(`screens.security.mode.${effective}`)}
          </Text>
        </View>
        <Text variant="caption" className="text-foreground">
          {posture}
        </Text>
        {ongoing > 0 ? (
          <View className="bg-error/10 flex-row items-center gap-1 rounded-full px-2 py-0.5">
            <Icon name="triangle-alert" className="text-error-strong size-3" />
            <Text variant="micro" className="text-error-strong font-semibold">
              {t('screens.security.environments.ongoing', { count: String(ongoing) })}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="gap-1">
        {hours.slice(0, 2).map((line) => (
          <View key={line} className="flex-row items-center gap-1.5">
            <Icon name="clock" className="text-muted-foreground size-3.5" />
            <Text variant="caption" numberOfLines={1} className="flex-1">
              {line}
            </Text>
          </View>
        ))}
        <View className="flex-row items-center gap-1.5">
          <Icon name="camera" className="text-muted-foreground size-3.5" />
          <Text variant="caption" numberOfLines={1} className="flex-1">
            {cameraLine}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
