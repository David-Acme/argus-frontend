import { useState } from 'react';
import { View } from 'react-native';
import type { ResponseContact } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ContactField } from '@/features/security/components/emergency-contacts-panel';
import { validPhone } from '@/features/security/model/response-recipients';

type EmergencyContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contact: ResponseContact) => void;
};

export function EmergencyContactDialog({ open, onOpenChange, onSave }: EmergencyContactDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const nameError = tried && name.trim() === '' ? t('screens.response.contacts-editor.name-required') : null;
  const phoneError = tried && !validPhone(phone) ? t('screens.response.contacts-editor.phone-invalid') : null;

  const submit = () => {
    setTried(true);
    if (name.trim() === '' || !validPhone(phone)) return;
    onSave({ name: name.trim().slice(0, 60), phone: phone.trim(), note: note.trim().slice(0, 60) });
    setName('');
    setPhone('');
    setNote('');
    setTried(false);
    onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.response.contacts-editor.dialog-title')}
      closeLabel={t('common.close')}
      onSubmit={submit}
      footer={
        <Button onPress={submit}>
          <Text>{t('screens.response.contacts-editor.save')}</Text>
        </Button>
      }>
      <View className="gap-3">
        <ContactField label={t('screens.response.contacts-editor.name')} value={name} error={nameError} onChange={setName} />
        <ContactField
          label={t('screens.response.contacts-editor.phone')}
          value={phone}
          error={phoneError}
          keyboardType="phone-pad"
          onChange={setPhone}
        />
        <ContactField label={t('screens.response.contacts-editor.note')} value={note} onChange={setNote} onSubmit={submit} />
      </View>
    </AdaptiveDialog>
  );
}

