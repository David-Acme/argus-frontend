import { useState } from 'react';
import { View } from 'react-native';
import type { EnvironmentResponseConfig, ResponseContact } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Input } from '@/shared/components/ui/input';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { validEmergency } from '@/features/security/model/response-recipients';

type EmergencyContactsPanelProps = {
  config: EnvironmentResponseConfig | null;
  editable: boolean;
  onContacts: (contacts: readonly ResponseContact[]) => Promise<boolean>;
  onEmergency: (number: string) => Promise<boolean>;
  onAdd: () => void;
  className?: string;
};

type FieldProps = {
  label: string;
  value: string;
  error?: string | null;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

const MAX_CONTACTS = 10;

export function ContactField({ label, value, error, placeholder, keyboardType = 'default', onChange, onSubmit }: FieldProps) {
  return (
    <View className="gap-1">
      <Text variant="micro">{label}</Text>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        onSubmitEditing={onSubmit}
      />
      {error ? (
        <Text variant="caption" className="text-error-strong">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function EmergencyContactsPanel({
  config,
  editable,
  onContacts,
  onEmergency,
  onAdd,
  className,
}: EmergencyContactsPanelProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const contacts = config?.contacts ?? [];
  const emergency = draft ?? config?.emergencyNumber ?? '';
  const emergencyError = !validEmergency(emergency.trim()) ? t('screens.response.contacts-editor.phone-invalid') : null;

  const commitEmergency = async () => {
    if (draft === null || emergencyError) return;
    const value = draft.trim();
    if (value !== (config?.emergencyNumber ?? '')) await onEmergency(value);
    setDraft(null);
  };

  const remove = (index: number) => void onContacts(contacts.filter((_, position) => position !== index));

  return (
      <Panel
        title={t('screens.response.contacts-editor.title')}
        description={editable ? t('screens.response.contacts-editor.description') : undefined}
        count={contacts.length}
        action={
          editable && contacts.length < MAX_CONTACTS ? (
            <IconButton icon="plus" label={t('screens.response.contacts-editor.add')} onPress={onAdd} />
          ) : undefined
        }
        className={className}>
        {contacts.length === 0 ? (
          <Text variant="caption">{t('screens.response.contacts-editor.empty')}</Text>
        ) : (
          <View className="gap-2">
            {contacts.map((contact, index) => (
              <View key={`${contact.id}-${contact.phone}`} className="min-h-11 flex-row items-center gap-3">
                <View className="bg-surface-secondary size-9 items-center justify-center rounded-full">
                  <Icon name="phone" className="text-foreground-secondary size-4" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text variant="label" numberOfLines={1}>
                    {contact.name}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {contact.note ? `${contact.phone} · ${contact.note}` : contact.phone}
                  </Text>
                </View>
                {editable ? (
                  <IconButton
                    icon="trash"
                    label={t('screens.response.contacts-editor.remove', { name: contact.name })}
                    onPress={() => remove(index)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}
        {editable ? (
          <View className="border-divider gap-1 border-t pt-3">
            <ContactField
              label={t('screens.response.contacts-editor.emergency')}
              value={emergency}
              error={emergencyError}
              placeholder={t('screens.response.contacts-editor.emergency-placeholder')}
              keyboardType="phone-pad"
              onChange={setDraft}
              onSubmit={() => void commitEmergency()}
            />
            <Text variant="caption">{t('screens.response.contacts-editor.emergency-hint')}</Text>
            {draft !== null && draft.trim() !== (config?.emergencyNumber ?? '') ? (
              <Button size="sm" variant="outline" className="self-start" onPress={() => void commitEmergency()}>
                <Text>{t('screens.response.contacts-editor.save')}</Text>
              </Button>
            ) : null}
          </View>
        ) : config?.emergencyNumber ? (
          <Text variant="caption">{`${t('screens.response.contacts-editor.emergency')}: ${config.emergencyNumber}`}</Text>
        ) : null}
      </Panel>
  );
}
