import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type FaceIntroProps = {
  enrolling: boolean;
  requesting: boolean;
  onStart: () => void;
};

const TIPS = ['tip-light', 'tip-cover', 'tip-front'] as const;

export function FaceIntro({ enrolling, requesting, onStart }: FaceIntroProps) {
  const { t } = useTranslation();
  return (
    <View className="w-full max-w-md gap-6 self-center">
      <View className="bg-accent-soft size-16 items-center justify-center rounded-3xl">
        <Icon name="scan-face" className="text-accent-strong size-8" />
      </View>
      <View className="gap-2">
        <Text variant="title">
          {enrolling ? t('screens.face.intro-enroll-title') : t('screens.face.intro-login-title')}
        </Text>
        <Text variant="body" className="text-foreground-secondary">
          {enrolling ? t('screens.face.intro-enroll-body') : t('screens.face.intro-login-body')}
        </Text>
      </View>
      <View className="gap-2.5">
        {TIPS.map((tip) => (
          <View key={tip} className="flex-row items-center gap-3">
            <Icon name="check" className="text-success size-4" />
            <Text variant="label" className="text-foreground-secondary flex-1">
              {t(`screens.face.${tip}`)}
            </Text>
          </View>
        ))}
      </View>
      {requesting ? (
        <View className="h-12 flex-row items-center justify-center gap-3">
          <ActivityIndicator />
          <Text variant="label">{t('screens.face.permission-waiting')}</Text>
        </View>
      ) : (
        <Button size="lg" onPress={onStart}>
          <Icon name="camera" />
          <Text>{t('screens.face.start-camera')}</Text>
        </Button>
      )}
    </View>
  );
}
