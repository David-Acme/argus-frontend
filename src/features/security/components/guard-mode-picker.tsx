import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import type { GuardMode, GuardModeState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { GUARD_MODES } from '@/shared/constants';
import { GUARD_MODE_ICONS } from '@/features/security/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type GuardModePickerProps = {
  state: GuardModeState | null;
  pending: GuardMode | null;
  onSelect: (mode: GuardMode) => void;
  readOnly?: boolean;
};

const hover = Platform.select({ web: 'hover:bg-surface-secondary/70', default: '' });

export function GuardModePicker({ state, pending, onSelect, readOnly = false }: GuardModePickerProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const selected = pending ?? state?.mode ?? null;

  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
      {GUARD_MODES.map((mode) => {
        const active = selected === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, busy: pending === mode, disabled: readOnly }}
            accessibilityLabel={t(`screens.security.mode.${mode}`)}
            accessibilityHint={t(`screens.security.mode.${mode}-detail`)}
            disabled={readOnly || pending != null}
            onPress={() => onSelect(mode)}
            className={cn(
              'min-h-[76px] flex-row items-start gap-3 rounded-2xl border p-3.5 active:opacity-80',
              isCompact ? 'w-full' : 'grow basis-[48%]',
              active
                ? 'bg-interactive border-interactive'
                : cn('bg-card border-border-subtle', hover)
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
                  className={cn(
                    'size-5',
                    active ? 'text-foreground-on-interactive' : 'text-foreground-secondary'
                  )}
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
  );
}
