import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardIconButton } from '@/shared/components/dashboard';
import { Text } from '@/shared/components/ui/text';
import { CONTENT_MAX_WIDTH } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Chrome for a secondary screen: back, title and one action, with the same
 * width cap and safe areas as the dashboard. The body owns its own scrolling,
 * so a virtualized list can fill it.
 */
export function ScreenShell({ title, subtitle, onBack, action, children }: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { windowClass, isExpanded, isShort } = useWindowClass();

  return (
    <View className="bg-background flex-1">
      <View
        className="w-full flex-1 self-center px-5 lg:px-8"
        style={{
          maxWidth: CONTENT_MAX_WIDTH[windowClass],
          paddingTop: insets.top + (isShort ? 8 : isExpanded ? 16 : 14),
          paddingBottom: insets.bottom,
        }}>
        <View className="flex-row items-center gap-3 pb-4">
          {onBack ? (
            <DashboardIconButton icon="arrow-left" label={t('common.back')} onPress={onBack} />
          ) : null}
          <View className="min-w-0 flex-1">
            <Text className="text-[22px] font-semibold tracking-tight" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-foreground-secondary text-[13px]" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
        {children}
      </View>
    </View>
  );
}
