import { View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ImpactSummary } from '@/features/modules/components/impact-summary';
import type { DisableTarget } from '@/features/modules/hooks/use-module-disable';

type DisableDialogProps = {
  target: DisableTarget | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DisableDialog({ target, busy, onClose, onConfirm }: DisableDialogProps) {
  const { t } = useTranslation();
  const name = target ? target.module.name || target.module.id : '';

  return (
    <AdaptiveDialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('screens.modules.impact.disable-title', { name })}
      description={t('screens.modules.impact.disable-description')}
      closeLabel={t('common.cancel')}
      onSubmit={onConfirm}
      footer={
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" disabled={busy} onPress={onClose}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={busy} onPress={onConfirm}>
            <Text>{t('screens.modules.impact.confirm-disable')}</Text>
          </Button>
        </View>
      }>
      {target ? (
        <ImpactSummary impact={target.impact} moduleName={name} uninstall={false} choices={{}} onChoose={() => undefined} />
      ) : null}
    </AdaptiveDialog>
  );
}
