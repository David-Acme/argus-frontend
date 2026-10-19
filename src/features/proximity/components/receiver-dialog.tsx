import { useState } from 'react';
import { View } from 'react-native';
import type { ProximityReceiverInput } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { LabelledInput } from '@/features/proximity/components/labelled-input';
import {
  parsePort,
  RECEIVER_DEFAULT_PORT,
  receiverErrors,
  type ProximityFieldError,
} from '@/features/proximity/model/proximity';

type ReceiverDialogProps = {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ProximityReceiverInput) => Promise<boolean>;
};

export function ReceiverDialog({ open, pending, onOpenChange, onSubmit }: ReceiverDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(String(RECEIVER_DEFAULT_PORT));
  const [errors, setErrors] = useState<readonly ProximityFieldError[]>([]);

  const errorOf = (field: ProximityFieldError) =>
    errors.includes(field) ? t(`screens.proximity.errors.${field}`) : null;

  const submit = async () => {
    const input: ProximityReceiverInput = {
      name: name.trim(),
      room: room.trim(),
      kind: 'esphome',
      host: host.trim(),
      port: parsePort(port),
    };
    const found = receiverErrors(input);
    setErrors(found);
    if (found.length > 0) return;
    if (!(await onSubmit(input))) return;
    setName('');
    setRoom('');
    setHost('');
    setPort(String(RECEIVER_DEFAULT_PORT));
    onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.proximity.receivers.add-title')}
      description={t('screens.proximity.receivers.add-description')}
      closeLabel={t('common.close')}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="outline" disabled={pending} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={pending} onPress={() => void submit()}>
            <Text>{t('screens.proximity.receivers.add')}</Text>
          </Button>
        </>
      }>
      <View className="gap-4 pb-1">
        <LabelledInput label={t('screens.proximity.fields.name')} value={name} onChange={setName} error={errorOf('name')} />
        <LabelledInput
          label={t('screens.proximity.fields.room')}
          placeholder={t('screens.proximity.fields.room-placeholder')}
          value={room}
          onChange={setRoom}
          error={errorOf('room')}
        />
        <LabelledInput
          label={t('screens.proximity.fields.host')}
          placeholder="esp32-sala.local"
          value={host}
          onChange={setHost}
          error={errorOf('host')}
        />
        <LabelledInput label={t('screens.proximity.fields.port')} value={port} onChange={setPort} error={errorOf('port')} numeric />
      </View>
    </AdaptiveDialog>
  );
}
