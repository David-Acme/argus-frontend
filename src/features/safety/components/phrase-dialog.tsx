import { useState } from 'react';
import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { phraseProblem, type PhraseProblem } from '@/features/safety/model/safety';

type PhraseDialogProps = {
  open: boolean;
  replacing: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (phrase: string) => Promise<boolean>;
};

const PROBLEM_KEY = {
  words: 'screens.safety.phrase.problem-words',
  digits: 'screens.safety.phrase.problem-digits',
  characters: 'screens.safety.phrase.problem-characters',
  long: 'screens.safety.phrase.problem-long',
} as const satisfies Record<Exclude<PhraseProblem, null>, TranslationKey>;

export function PhraseDialog({ open, replacing, onOpenChange, onSave }: PhraseDialogProps) {
  const { t } = useTranslation();
  const [phrase, setPhrase] = useState('');
  const [saving, setSaving] = useState(false);
  const problem = phraseProblem(phrase);
  const shownProblem = phrase.length > 0 ? problem : null;
  const label = t('screens.safety.phrase.field');

  const reset = () => setPhrase('');

  const save = async () => {
    if (problem || saving) return;
    setSaving(true);
    const saved = await onSave(phrase.trim());
    setSaving(false);
    if (!saved) return;
    reset();
    onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={replacing ? t('screens.safety.phrase.change') : t('screens.safety.phrase.create')}
      description={t('screens.safety.phrase.description')}
      closeLabel={t('common.cancel')}
      onSubmit={() => void save()}
      footer={
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button disabled={problem !== null} loading={saving} onPress={() => void save()}>
            <Text>{t('common.save')}</Text>
          </Button>
        </View>
      }>
      <View className="gap-4">
        <View className="gap-1.5">
          <Text variant="label">{label}</Text>
          <Input
            value={phrase}
            onChangeText={setPhrase}
            placeholder={t('screens.safety.phrase.placeholder')}
            variant={shownProblem ? 'error' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            importantForAutofill="no"
            textContentType="none"
            autoFocus
            onSubmitEditing={() => void save()}
            accessibilityLabel={label}
          />
          <Text variant="caption" className={shownProblem ? 'text-error-strong' : undefined}>
            {shownProblem ? t(PROBLEM_KEY[shownProblem]) : t('screens.safety.phrase.hint')}
          </Text>
        </View>
        <View className="bg-surface-secondary flex-row items-start gap-2.5 rounded-2xl px-3.5 py-3">
          <Icon name="shield-check" className="text-foreground-secondary mt-0.5 size-4" />
          <Text variant="caption" className="min-w-0 flex-1">
            {t('screens.safety.phrase.private')}
          </Text>
        </View>
      </View>
    </AdaptiveDialog>
  );
}
