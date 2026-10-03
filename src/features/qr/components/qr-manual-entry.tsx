import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { TranslationKey } from '@/core/types';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

type QrManualEntryProps = {
  label: TranslationKey;
  placeholder: TranslationKey;
  invalid: boolean;
  onSubmit: (value: string) => void;
  startExpanded?: boolean;
};

function QrManualEntry({ label, placeholder, invalid, onSubmit, startExpanded = false }: QrManualEntryProps) {
  const [expanded, setExpanded] = useState(startExpanded);
  const [value, setValue] = useState('');
  const { t } = useTranslation();
  const trimmed = value.trim();

  const handleExpand = useCallback(() => setExpanded(true), []);

  const handleSubmit = useCallback(() => {
    if (trimmed.length === 0) {
      return;
    }
    onSubmit(trimmed);
  }, [onSubmit, trimmed]);

  if (!expanded) {
    return (
      <Button variant="outline" onPress={handleExpand} accessibilityLabel={t(label)}>
        <Icon name="keyboard" />
        <Text>{t(label)}</Text>
      </Button>
    );
  }

  return (
    <View className="gap-2">
      <Input
        value={value}
        onChangeText={setValue}
        placeholder={t(placeholder)}
        variant={invalid ? 'error' : 'default'}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={handleSubmit}
        accessibilityLabel={t(placeholder)}
      />
      <Button disabled={trimmed.length === 0} onPress={handleSubmit}>
        <Text>{t('common.continue')}</Text>
      </Button>
    </View>
  );
}

export { QrManualEntry };
export type { QrManualEntryProps };
