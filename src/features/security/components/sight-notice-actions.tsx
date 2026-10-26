import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { answerTamperAsk, answerViewCheck, claimTamper } from '@/features/security/hooks/use-maintenance';
import type { SightNotice } from '@/features/security/model/tamper-notice';

type SightNoticeActionsProps = {
  notice: SightNotice;
  onAnswered?: () => void;
};

type Choice = { key: string; label: string; primary: boolean; run: () => Promise<boolean> };

export function SightNoticeActions({ notice, onAnswered }: SightNoticeActionsProps) {
  const { t } = useTranslation();
  const { guard } = useCapabilities();
  const [busy, setBusy] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const choices = ((): Choice[] => {
    switch (notice.kind) {
      case 'ask':
        return guard.answerTamper
          ? [
              { key: 'me', label: t('screens.security.tamper.ask-me'), primary: true, run: () => answerTamperAsk(notice.askId, 'me') },
              { key: 'no', label: t('screens.security.tamper.ask-no'), primary: false, run: () => answerTamperAsk(notice.askId, 'no') },
            ]
          : [];
      case 'view-check':
        return guard.maintenance
          ? [
              {
                key: 'yes',
                label: t('screens.security.maintenance.view-yes'),
                primary: true,
                run: () => answerViewCheck(notice.maintenanceId, notice.cameraId, true),
              },
              {
                key: 'no',
                label: t('screens.security.maintenance.view-no'),
                primary: false,
                run: () => answerViewCheck(notice.maintenanceId, notice.cameraId, false),
              },
            ]
          : [];
      case 'tamper':
        return guard.maintenance && notice.canClaim && notice.incidentId > 0
          ? [{ key: 'mine', label: t('screens.security.tamper.claim'), primary: false, run: () => claimTamper(notice.incidentId) }]
          : [];
      case 'lens':
        return [];
    }
  })();

  const choose = async (choice: Choice) => {
    setBusy(choice.key);
    const done = await choice.run();
    setBusy(null);
    if (!done) return;
    setAnswered(true);
    onAnswered?.();
  };

  if (choices.length === 0) return null;
  if (answered) {
    return (
      <Text variant="meta" tone="2">
        {t('screens.security.tamper.answered')}
      </Text>
    );
  }

  return (
    <>
      {choices.map((choice) => (
        <Button
          key={choice.key}
          compact
          variant={choice.primary ? 'primary' : 'secondary'}
          label={choice.label}
          disabled={busy !== null && busy !== choice.key}
          onPress={() => choose(choice)}
        />
      ))}
    </>
  );
}
