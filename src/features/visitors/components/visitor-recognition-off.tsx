import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVisitorRecognitionSwitch, VisitorAcknowledgementDialog } from '@/features/privacy';

type VisitorRecognitionOffProps = {
  variant: 'inline' | 'panel';
  onEnabled: () => void;
};

export function VisitorRecognitionOff({ variant, onEnabled }: VisitorRecognitionOffProps) {
  const { t } = useTranslation();
  const recognition = useVisitorRecognitionSwitch();
  const [asking, setAsking] = useState(false);

  const confirm = async () => {
    if (!(await recognition.enable())) return;
    setAsking(false);
    onEnabled();
  };

  return (
    <>
      <EmptyState
        variant={variant}
        icon="scan-face"
        title={t('screens.visitors.off-title')}
        hint={t('screens.visitors.off-description')}
        action={
          <Button size="sm" onPress={() => setAsking(true)}>
            <Text>{t('screens.visitors.off-action')}</Text>
          </Button>
        }
      />
      <VisitorAcknowledgementDialog
        open={asking}
        saving={recognition.pending}
        onOpenChange={setAsking}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
