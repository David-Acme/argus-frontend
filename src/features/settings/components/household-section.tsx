import { useState } from 'react';
import { View } from 'react-native';
import type { Setting, SettingsOwner } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Field } from '@/shared/ui/field';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Sheet } from '@/shared/ui/sheet';
import { Text } from '@/shared/ui/text';
import { useHomeName } from '@/features/settings/hooks/use-home-name';

type HouseholdSectionProps = {
  setting: Setting | null;
  onCatalog: (catalogs: readonly SettingsOwner[]) => void;
};

type HomeNameSheetProps = {
  value: string;
  onCatalog: (catalogs: readonly SettingsOwner[]) => void;
  onClose: () => void;
};

function HomeNameSheet({ value, onCatalog, onClose }: HomeNameSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const home = useHomeName({ onCatalog });
  const save = async () => {
    if (await home.save(draft)) onClose();
  };
  const change = (text: string) => {
    setDraft(text);
    home.clearError();
  };
  return (
    <Sheet
      open
      variant="form"
      title={t('screens.settings.household.name')}
      onClose={onClose}
      dirty={draft !== value}
      actions={{ primary: { label: t('common.save'), onPress: save, busy: home.busy } }}>
      <View className="gap-4">
        <Text variant="body" tone="2">
          {t('screens.settings.household.hint')}
        </Text>
        <Field
          label={t('screens.settings.household.name')}
          placeholder={t('screens.settings.household.placeholder')}
          value={draft}
          onChangeText={change}
          error={home.error ? t(home.error) : undefined}
          submit={{ key: 'done', onSubmit: () => void save() }}
        />
      </View>
    </Sheet>
  );
}

export function HouseholdSection({ setting, onCatalog }: HouseholdSectionProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  if (!setting) return null;
  return (
    <Section title={t('screens.settings.household.title')}>
      <Row
        leading={<Avatar icon="home" />}
        title={t('screens.settings.household.name')}
        meta={setting.value || t('screens.settings.household.unset')}
        chevron
        onPress={() => setEditing(true)}
      />
      {editing ? (
        <HomeNameSheet
          value={setting.value}
          onCatalog={onCatalog}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </Section>
  );
}
