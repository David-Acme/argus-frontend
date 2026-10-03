import { QR_SCAN_DOT_PULSE_MS, QR_SCAN_FEEDBACK } from '@/features/qr/constants';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import type { QrScanFeedback, QrScanTone } from '@/core/types';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type QrScanSheetProps = {
  feedback: QrScanFeedback;
  title: string;
  description: string | null;
  reduceMotion: boolean;
  variant?: 'sheet' | 'supporting-pane';
  children?: ReactNode;
};

const PILL_TONE: Record<QrScanTone, string> = {
  muted: 'bg-surface-secondary',
  accent: 'bg-accent-soft',
  error: 'bg-error',
};

const PILL_LABEL_TONE: Record<QrScanTone, string> = {
  muted: 'text-foreground-secondary',
  accent: 'text-foreground',
  error: 'text-destructive-foreground',
};

const PILL_ICON_TONE: Record<QrScanTone, string> = {
  muted: 'text-foreground-secondary',
  accent: 'text-accent-strong',
  error: 'text-destructive-foreground',
};

const DOT_TONE: Record<QrScanTone, string> = {
  muted: 'bg-foreground-secondary',
  accent: 'bg-accent',
  error: 'bg-destructive-foreground',
};

function QrScanSheet({
  feedback,
  title,
  description,
  reduceMotion,
  variant = 'sheet',
  children,
}: QrScanSheetProps) {
  const dotOpacity = useSharedValue(1);
  const { t } = useTranslation();
  const { label, tone, icon } = QR_SCAN_FEEDBACK[feedback];
  const isSupportingPane = variant === 'supporting-pane';

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  useEffect(() => {
    if (icon !== null || reduceMotion) {
      cancelAnimation(dotOpacity);
      dotOpacity.value = 1;
      return;
    }
    dotOpacity.value = withRepeat(withTiming(0.35, { duration: QR_SCAN_DOT_PULSE_MS }), -1, true);

    return () => cancelAnimation(dotOpacity);
  }, [dotOpacity, icon, reduceMotion]);

  return (
    <View className={cn(!isSupportingPane && 'px-5 pt-4')}>
      {isSupportingPane ? (
        <View className="bg-surface-secondary mb-5 size-12 items-center justify-center rounded-2xl">
          <Icon name="scan-barcode" className="text-foreground-secondary size-6" />
        </View>
      ) : null}

      <View
        className={cn(
          'flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1',
          PILL_TONE[tone]
        )}
        accessibilityLiveRegion="polite">
        {icon === null ? (
          <Animated.View style={dotStyle}>
            <View className={cn('size-1.5 rounded-full', DOT_TONE[tone])} />
          </Animated.View>
        ) : (
          <Icon name={icon} className={cn('size-3.5', PILL_ICON_TONE[tone])} />
        )}
        <Text variant="micro" className={cn('font-semibold', PILL_LABEL_TONE[tone])}>{t(label)}</Text>
      </View>

      <Text
        variant={isSupportingPane ? 'title' : 'subhead'}
        className={isSupportingPane ? 'mt-4' : 'mt-3'}>
        {title}
      </Text>

      {description === null ? null : (
        <Text variant="caption" className="text-foreground-secondary mt-1">{description}</Text>
      )}

      {children === undefined ? null : (
        <View className={cn(isSupportingPane ? 'mt-6' : 'mt-4', 'gap-2')}>{children}</View>
      )}
    </View>
  );
}

export { QrScanSheet };
export type { QrScanSheetProps };
