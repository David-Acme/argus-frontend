import { View } from 'react-native';
import type { CameraSirenControls } from '@/features/cameras/hooks/use-camera-siren';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type CameraSirenSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  controls: CameraSirenControls;
};

export function CameraSirenSheet({ open, onOpenChange, cameraName, controls }: CameraSirenSheetProps) {
  const { t } = useTranslation();
  const close = () => onOpenChange(false);

  const confirmView = (
    <View className="gap-3">
      <Text variant="body">{t('screens.cameras.siren-confirm-body', { name: cameraName })}</Text>
      <View className="bg-error/10 flex-row items-center gap-2 rounded-md p-3">
        <Icon name="siren" className="text-error-strong size-4" />
        <Text variant="caption" className="min-w-0 flex-1">
          {t('screens.cameras.siren-warning')}
        </Text>
      </View>
    </View>
  );

  const countdownView = (
    <View className="items-center gap-3 py-2">
      <Text variant="display" className="text-error-strong">
        {controls.secondsLeft}
      </Text>
      <Text variant="body" className="text-center">
        {t('screens.cameras.siren-countdown-body', { name: cameraName })}
      </Text>
    </View>
  );

  const soundingView = (
    <View className="items-center gap-3 py-2">
      <Icon name="siren" className="text-error-strong size-10" />
      <Text variant="subhead" className="text-center">
        {t('screens.cameras.siren-sounding', { name: cameraName })}
      </Text>
      <Text variant="caption">
        {t('screens.cameras.siren-until-stop', { seconds: controls.remaining })}
      </Text>
    </View>
  );

  const footer =
    controls.phase === 'countdown' ? (
      <Button variant="outline" onPress={controls.cancel}>
        <Text>{t('common.cancel')}</Text>
      </Button>
    ) : controls.phase === 'sounding' ? (
      <Button variant="destructive" onPress={controls.stop}>
        <Text>{t('screens.cameras.siren-stop')}</Text>
      </Button>
    ) : (
      <>
        <Button variant="outline" onPress={close}>
          <Text>{t('common.cancel')}</Text>
        </Button>
        <Button variant="destructive" onPress={controls.confirm}>
          <Text>{t('screens.cameras.siren-activate')}</Text>
        </Button>
      </>
    );

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) controls.close();
        onOpenChange(next);
      }}
      title={t('screens.cameras.siren-title')}
      closeLabel={t('common.close')}
      footer={footer}>
      {controls.phase === 'countdown' ? countdownView : controls.phase === 'sounding' ? soundingView : confirmView}
    </AdaptiveDialog>
  );
}
