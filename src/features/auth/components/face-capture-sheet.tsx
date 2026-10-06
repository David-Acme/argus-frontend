import { View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { FaceError } from '@/features/auth/model/face-error';
import type { OnboardingFlowId } from '@/features/auth/model/onboarding-flow';

type FaceCaptureSheetProps = {
  enrolling: boolean;
  flow: OnboardingFlowId;
  title: string;
  hint: string | null;
  error: FaceError | null;
  friendlyError: string | null;
  notice: string | null;
  submitting: boolean;
  manualCapture: boolean;
  onManualCapture: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

export function FaceCaptureSheet({
  enrolling,
  flow,
  title,
  hint,
  error,
  friendlyError,
  notice,
  submitting,
  manualCapture,
  onManualCapture,
  onLayout,
}: FaceCaptureSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-card/95 w-full max-w-md self-center rounded-t-2xl px-5 py-6"
      style={{ paddingBottom: insets.bottom + 24 }}
      onLayout={onLayout}>
      <View className="gap-3">
        {enrolling ? (
          <OnboardingSteps flow={flow} step="face" />
        ) : null}
        <Text variant="headline" numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {title}
        </Text>
        {hint ? (
          <Text
            variant="caption" className="text-foreground-secondary"
            numberOfLines={2}
            maxFontSizeMultiplier={1.25}>
            {hint}
          </Text>
        ) : null}

        <View className="min-h-6 justify-center">
          {error ? (
            <View className="flex-row items-center gap-2.5">
              <Icon name="triangle-alert" className="text-error-strong size-5" />
              <View className="flex-1 gap-0.5">
                <Text
                  variant="body" className="text-error-strong"
                  maxFontSizeMultiplier={1.25}>
                  {friendlyError}
                </Text>
                <Text
                  className="text-error-strong/70 text-micro leading-4"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}>
                  {error.code}
                </Text>
                {__DEV__ && error.message && error.message !== friendlyError ? (
                  <Text
                    className="text-error-strong/70 text-micro leading-4"
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.15}>
                    {error.message}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : notice ? (
            <View className="flex-row items-center gap-2.5">
              <Icon name="check-circle" className="text-success size-5" />
              <Text
                variant="body" className="text-success flex-1"
                maxFontSizeMultiplier={1.25}>
                {notice}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="h-11 justify-center">
          {submitting ? (
            <View className="flex-row items-center justify-center gap-3">
              <Icon name="refresh-cw" className="text-accent-strong size-5" />
              <Text maxFontSizeMultiplier={1.25}>{t('screens.face.sending')}</Text>
            </View>
          ) : manualCapture ? (
            <Button variant="outline" onPress={onManualCapture}>
              <Icon name="camera" />
              <Text>{t('screens.face.manual-capture')}</Text>
            </Button>
          ) : (
            <Text
              variant="caption" className="text-foreground-secondary text-center"
              maxFontSizeMultiplier={1.25}>
              {t('screens.face.auto-capture')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
