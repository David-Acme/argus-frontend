import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import type { GuardMode, GuardModeState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { GUARD_MODE_ICONS, GUARD_MODES } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type GuardModePickerProps = {
  state: GuardModeState | null;
  pending: GuardMode | null;
  onSelect: (mode: GuardMode) => void;
};

const hover = Platform.select({ web: 'hover:bg-surface-secondary/70', default: '' });

export function GuardModePicker({ state, pending, onSelect }: GuardModePickerProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const selected = pending ?? state?.mode ?? null;
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
    <View className="gap-3">
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
        {GUARD_MODES.map((mode) => {
          const active = selected === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, busy: pending === mode }}
              accessibilityLabel={t(`screens.security.mode.${mode}`)}
              accessibilityHint={t(`screens.security.mode.${mode}-detail`)}
              disabled={pending != null}
              onPress={() => onSelect(mode)}
              className={cn(
                'min-h-[76px] flex-row items-start gap-3 rounded-2xl border p-3.5 active:opacity-80',
                isCompact ? 'w-full' : 'basis-[48%] grow',
                active ? 'bg-interactive border-interactive' : cn('bg-card border-border-subtle', hover)
              )}>
              <View
                className={cn(
                  'size-9 items-center justify-center rounded-full',
                  active ? 'bg-foreground-on-interactive/15' : 'bg-surface-secondary'
                )}>
                {pending === mode ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Icon
                    name={GUARD_MODE_ICONS[mode]}
                    className={cn('size-5', active ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
                  />
                )}
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text
                  variant="subhead"
                  className={active ? 'text-foreground-on-interactive' : 'text-foreground'}>
                  {t(`screens.security.mode.${mode}`)}
                </Text>
                <Text
                  variant="caption"
                  className={active ? 'text-foreground-on-interactive/80' : undefined}>
                  {t(`screens.security.mode.${mode}-detail`)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {schedule ? (
        <View className="bg-accent/10 flex-row items-center gap-2 rounded-xl px-3 py-2">
          <Icon name="clock" className="text-accent-strong size-4" />
          <Text variant="caption" className="text-foreground flex-1">
            {schedule}
          </Text>
        </View>
      ) : null}
      <Text variant="caption" className="px-1">
        {t('screens.security.mode.note')}
      </Text>
    </View>
  );
}
