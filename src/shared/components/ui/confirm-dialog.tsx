import { View } from 'react-native';
import { useConfirmStore } from '@/core/stores';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export function ConfirmDialog() {
  const { t } = useTranslation();
  const request = useConfirmStore((state) => state.request);
  const answer = useConfirmStore((state) => state.answer);

  return (
    <AdaptiveDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) answer(false);
      }}
      title={request?.title ?? ''}
      closeLabel={t('common.close')}
      contentClassName="sm:max-w-[440px]"
      footer={
        <>
          <Button variant="outline" onPress={() => answer(false)}>
            <Text>{request?.cancelLabel ?? t('common.cancel')}</Text>
          </Button>
          <Button
            variant={request?.intent === 'danger' ? 'destructive' : 'default'}
            onPress={() => answer(true)}>
            <Text>{request?.confirmLabel ?? t('common.confirm')}</Text>
          </Button>
        </>
      }>
      {request?.description ? (
        <View className="pb-1">
          <Text className="text-foreground-secondary text-caption leading-5">
            {request.description}
          </Text>
        </View>
      ) : null}
    </AdaptiveDialog>
  );
}
