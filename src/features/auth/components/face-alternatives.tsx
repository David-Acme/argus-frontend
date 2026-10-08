import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  FACE_ALTERNATIVE_LABEL_KEYS,
  type FaceAlternativeAction,
  type FaceAlternatives as FaceAlternativesModel,
} from '@/features/auth/model/face-alternatives';

type FaceAlternativesProps = {
  alternatives: FaceAlternativesModel;
  onLoginQr: () => void;
  onBackToStart: () => void;
};

const ICONS: Record<FaceAlternativeAction, 'qr-code' | 'arrow-left'> = {
  'login-qr': 'qr-code',
  'back-to-start': 'arrow-left',
};

export function FaceAlternatives({ alternatives, onLoginQr, onBackToStart }: FaceAlternativesProps) {
  const { t } = useTranslation();
  const handlers: Record<FaceAlternativeAction, () => void> = {
    'login-qr': onLoginQr,
    'back-to-start': onBackToStart,
  };
  return (
    <View className="w-full gap-2.5">
      {alternatives.hint ? (
        <Text variant="caption" className="text-foreground-secondary text-center">
          {t(alternatives.hint)}
        </Text>
      ) : null}
      {alternatives.actions.map((action) => (
        <Button
          key={action}
          variant={action === 'login-qr' ? 'outline' : 'ghost'}
          onPress={handlers[action]}>
          <Icon name={ICONS[action]} />
          <Text>{t(FACE_ALTERNATIVE_LABEL_KEYS[action])}</Text>
        </Button>
      ))}
    </View>
  );
}
