import { useState } from 'react';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';
import { Field } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/sheet';

export type AnnounceSheetProps = { cameraId: string; open: boolean; onClose: () => void };

const ANNOUNCE_MAX = 300;

export function AnnounceSheet({ cameraId, open, onClose }: AnnounceSheetProps) {
  const { t, language } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const close = () => {
    setText('');
    setError(undefined);
    onClose();
  };
  const send = async () => {
    const words = text.trim();
    if (words.length === 0) return setError(t('screens.cameras.announce.empty'));
    if (words.length > ANNOUNCE_MAX) return setError(t('screens.cameras.announce.long'));
    const sent = await runServiceAction({
      call: () => cameraControlService.talk(cameraId, { text: words, lang: language }),
      success: t('screens.cameras.talk-sent'),
      errorTitle: t('screens.cameras.announce.failed'),
    });
    if (sent) close();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('screens.cameras.announce.title')}
      variant="form"
      dirty={text.trim().length > 0}
      actions={{ primary: { label: t('screens.cameras.talk-send'), onPress: send } }}>
      <Field
        kind="multiline"
        label={t('screens.cameras.announce.label')}
        placeholder={t('screens.cameras.talk-placeholder')}
        hint={t('screens.cameras.announce.hint')}
        value={text}
        error={error}
        onChangeText={(next) => {
          setText(next);
          setError(undefined);
        }}
      />
    </Sheet>
  );
}
