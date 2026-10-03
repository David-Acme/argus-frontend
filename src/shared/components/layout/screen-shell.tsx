import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardIconButton, DashboardNavRail } from '@/shared/components/dashboard';
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

export function ScreenShell({ title, subtitle, onBack, action, children }: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { windowClass, isExpanded, isShort, usesNavRail } = useWindowClass();

  return (
    <View className="bg-background flex-1 flex-row">
      {usesNavRail ? <DashboardNavRail /> : null}
      <View
        className="mx-auto w-full flex-1 px-5 lg:px-8"
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
            <Text variant="title" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" className="text-foreground-secondary" numberOfLines={1}>
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
