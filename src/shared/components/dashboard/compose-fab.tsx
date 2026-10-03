import { Portal } from '@rn-primitives/portal';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';
import { Icon } from '@/shared/components/ui/icon';
import { MorphIcon } from '@/shared/components/ui/morph-icon';
import { Text } from '@/shared/components/ui/text';
import {
  BOTTOM_NAV_GAP,
  BOTTOM_NAV_HEIGHT,
  COMPOSE_ACTIONS,
  IS_NATIVE,
  COMPOSE_ITEM_STAGGER_MS,
  NAV_RAIL_WIDTH,
  colorTokens,
} from '@/shared/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { itemIn } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';

type ComposeFabProps = {
  size?: number;
  anchor?: 'bar' | 'rail';
};

export function ComposeFab({ size = 60, anchor = 'bar' }: ComposeFabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const iconColor = colorTokens[theme === 'dark' ? 'dark' : 'light']['foreground-on-interactive'];

  const labels: Record<string, string> = useMemo(
    () => ({
      event: t('screens.agenda.new-event'),
      project: t('screens.projects.new-project'),
      camera: t('screens.cameras.connect'),
      voice: t('screens.home.talk'),
    }),
    [t]
  );

  const actions = useMemo(
    () =>
      COMPOSE_ACTIONS.filter(
        (action) =>
          (IS_NATIVE || !action.nativeOnly) && (!action.table || can(action.table, 'create')),
      ),
    [can]
  );

  const close = () => setOpen(false);

  const stackPosition =
    anchor === 'bar'
      ? {
          right: 20,
          bottom: insets.bottom + BOTTOM_NAV_GAP + BOTTOM_NAV_HEIGHT + 12,
          alignItems: 'flex-end' as const,
        }
      : {
          left: NAV_RAIL_WIDTH + 12,
          bottom: insets.bottom + size + 24,
          alignItems: 'flex-start' as const,
        };

  return (
    <>
      {open ? (
        <Portal name="compose-fab">
          <Animated.View
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(140)}
            className="bg-overlay/60 absolute inset-0">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              className="flex-1"
              onPress={close}
            />
          </Animated.View>

          <View pointerEvents="box-none" className="absolute gap-2.5" style={stackPosition}>
            {actions.map((action, index) => (
              <Animated.View
                key={action.id}
                entering={itemIn.delay(index * COMPOSE_ITEM_STAGGER_MS)}
                exiting={FadeOut.duration(120)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={labels[action.id]}
                  onPress={() => {
                    close();
                    router.push(action.route);
                  }}
                  className={cn(
                    'flex-row items-center gap-2.5 active:opacity-80',
                    anchor === 'rail' && 'flex-row-reverse'
                  )}>
                  <View className="bg-card rounded-full px-3.5 py-2 shadow-lg shadow-black/25">
                    <Text className="text-caption font-semibold">{labels[action.id]}</Text>
                  </View>
                  <View className="bg-card size-11 items-center justify-center rounded-full shadow-lg shadow-black/25">
                    <Icon name={action.icon} className="text-foreground size-5" />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Portal>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('screens.home.compose')}
        onPress={() => setOpen((value) => !value)}
        style={{ width: size, height: size }}
        className="bg-interactive z-50 items-center justify-center rounded-full shadow-lg shadow-black/25 active:opacity-80">
        <MorphIcon name={open ? 'x' : 'plus'} size={size >= 56 ? 28 : 24} color={iconColor} />
      </Pressable>
    </>
  );
}
