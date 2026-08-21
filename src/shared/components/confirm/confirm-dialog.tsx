import { View } from 'react-native';
import { useConfirmStore } from '@/core/stores';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

/**
 * Single host for `confirm()`, mounted by the root layout. It is a sheet on a
 * phone and a dialog on a laptop, like every other overlay.
 */
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
          <Text className="text-foreground-secondary text-[13px] leading-5">
            {request.description}
          </Text>
        </View>
      ) : null}
    </AdaptiveDialog>
  );
}
