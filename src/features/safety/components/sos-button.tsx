import { useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';
import { Button } from '@/shared/ui/button';
import { Confirm } from '@/shared/ui/confirm';
import { safetyService } from '@/features/safety/services/safety.service';

type SosButtonProps = { environmentId?: number; band?: boolean };

export function SosButton({ environmentId, band }: SosButtonProps) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const send = () =>
    runServiceAction({
      call: () => safetyService.panic(environmentId),
      success: t('screens.safety.panic.sent'),
      errorTitle: t('screens.safety.panic.failed'),
    });
  return (
    <>
      <Button
        compact
        label={t(band ? 'screens.security.sos.band' : 'screens.security.sos.label')}
        hold={{ onHold: send, hint: t('screens.security.sos.hint') }}
        onPress={() => setAsking(true)}
      />
      <Confirm
        open={asking}
        variant="destructive"
        title={t('screens.security.sos.title')}
        body={t('screens.security.sos.body')}
        confirmLabel={t('screens.security.sos.confirm')}
        onConfirm={() => {
          setAsking(false);
          return send();
        }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
