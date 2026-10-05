import { useState } from 'react';
import { View } from 'react-native';
import type { VisitorCategory, VisitorDetail } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { Input } from '@/shared/components/ui/input';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { VISITOR_CATEGORY_ICONS } from '@/features/visitors/constants';
import { VISITOR_CATEGORIES } from '@/features/visitors/model/visitor';
import { categoryLabel } from '@/features/visitors/model/visitor-label';
import type { VisitorUpdate } from '@/features/visitors/services/visitor.service';

type VisitorProfileFormProps = {
  visitor: VisitorDetail;
  saving: boolean;
  onSave: (update: VisitorUpdate) => void;
  className?: string;
};

export function VisitorProfileForm({ visitor, saving, onSave, className }: VisitorProfileFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(visitor.name);
  const [category, setCategory] = useState<VisitorCategory>(visitor.category);
  const [note, setNote] = useState(visitor.note);
  const dirty = name.trim() !== visitor.name || category !== visitor.category || note.trim() !== visitor.note;
  const options = VISITOR_CATEGORIES.map((value) => ({
    value,
    label: categoryLabel(value, t),
    icon: VISITOR_CATEGORY_ICONS[value],
  }));

  const save = () => onSave({ name: name.trim(), category, note: note.trim() });

  return (
    <Panel className={className}>
      <View className="gap-1.5">
        <Text variant="label">{t('screens.visitors.name')}</Text>
        <Input
          value={name}
          onChangeText={setName}
          maxLength={60}
          placeholder={t('screens.visitors.name-placeholder')}
          accessibilityLabel={t('screens.visitors.name')}
          onSubmitEditing={save}
        />
      </View>
      <View className="gap-1.5">
        <Text variant="label">{t('screens.visitors.type')}</Text>
        <FilterChips
          options={options}
          value={category === '' ? null : category}
          onChange={(value) => setCategory((current) => (current === value ? '' : value))}
        />
        {category === 'watchlist' ? (
          <Text variant="caption" className="text-error-strong">
            {t('screens.visitors.watchlist-hint')}
          </Text>
        ) : null}
      </View>
      <View className="gap-1.5">
        <Text variant="label">{t('screens.visitors.note')}</Text>
        <Input
          value={note}
          onChangeText={setNote}
          maxLength={280}
          placeholder={t('screens.visitors.note-placeholder')}
          accessibilityLabel={t('screens.visitors.note')}
        />
      </View>
      <Button disabled={!dirty} loading={saving} onPress={save} className="self-end">
        <Text>{t('screens.visitors.save')}</Text>
      </Button>
    </Panel>
  );
}
