import { View } from 'react-native';
import type { CameraSirenControls } from '@/features/cameras/hooks/use-camera-siren';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type CameraSirenPanelProps = {
  controls: CameraSirenControls;
  canSiren: boolean;
  onActivate: () => void;
  className?: string;
};

export function CameraSirenPanel({ controls, canSiren, onActivate, className }: CameraSirenPanelProps) {
  const { t } = useTranslation();

  return (
    <Panel className={className}>
      <View className="flex-row items-center gap-3">
        <View
          className={
            controls.sounding
              ? 'bg-error/15 size-10 items-center justify-center rounded-full'
              : 'bg-surface-secondary size-10 items-center justify-center rounded-full'
          }>
          <Icon name="siren" className={controls.sounding ? 'text-error-strong size-5' : 'text-foreground-secondary size-5'} />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="label">{t('screens.cameras.siren-title')}</Text>
          <Text variant="caption" className="min-w-0">
            {controls.sounding
              ? t('screens.cameras.siren-until-stop', { seconds: controls.remaining })
              : canSiren
                ? t('screens.cameras.siren-hint')
                : t('screens.cameras.siren-unsupported')}
          </Text>
        </View>
        {controls.sounding ? (
          <Button variant="destructive" onPress={controls.stop}>
            <Text>{t('screens.cameras.siren-stop')}</Text>
          </Button>
        ) : (
          <Button variant="outline" onPress={onActivate} disabled={!canSiren}>
            <Text>{t('screens.cameras.siren-activate')}</Text>
          </Button>
        )}
      </View>
    </Panel>
  );
}
