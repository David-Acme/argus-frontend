import { View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type WatchmanAcknowledgementDialogProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const WATCHMAN_ACK_POINTS = [
  'watchman-ack-installer',
  'watchman-ack-sign',
  'watchman-ack-rest',
  'watchman-ack-consent',
  'watchman-ack-retention',
] as const;

export function WatchmanAcknowledgementDialog({
  open,
  saving,
  onOpenChange,
  onConfirm,
}: WatchmanAcknowledgementDialogProps) {
  const { t } = useTranslation();
  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.privacy.household.watchman-ack-title')}
      description={t('screens.privacy.household.watchman-ack-intro')}
      closeLabel={t('common.close')}
      onSubmit={onConfirm}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} onPress={onConfirm}>
            <Text>{t('screens.privacy.household.watchman-ack-confirm')}</Text>
          </Button>
        </>
      }>
      <View className="gap-3 pb-1">
        {WATCHMAN_ACK_POINTS.map((point) => (
          <View key={point} className="flex-row items-start gap-3">
            <Icon name="check" className="text-success mt-0.5 size-4" />
            <Text variant="body" className="text-foreground-secondary flex-1">
              {t(`screens.privacy.household.${point}`)}
            </Text>
          </View>
        ))}
      </View>
    </AdaptiveDialog>
  );
}
