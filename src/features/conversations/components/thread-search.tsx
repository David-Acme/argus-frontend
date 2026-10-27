import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Field } from '@/shared/ui/field';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Sheet, useOpenedOnce } from '@/shared/ui/sheet';
import { useThreadSearch } from '@/features/conversations/hooks/use-thread-search';

export type ThreadSearchProps = { counterpartId: number; open: boolean; onClose: () => void };

export function ThreadSearch({ counterpartId, open, onClose }: ThreadSearchProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const mounted = useOpenedOnce(open);
  const search = useThreadSearch(counterpartId, open);
  if (!mounted) return null;
  const typed = search.text.trim().length > 0;
  return (
    <Sheet open={open} onClose={onClose} title={t('screens.conversations.search.title')} long>
      <View className="gap-3">
        <Field
          label={t('screens.conversations.search.label')}
          value={search.text}
          onChangeText={search.setText}
        />
        {typed && search.results.length === 0 ? (
          <Notice centred icon="search" title={t('screens.conversations.search.empty')} />
        ) : null}
        {search.results.map((row) => (
          <Row
            key={row.id}
            title={row.body}
            meta={`${date.formatDayMonth(new Date(row.createdAt))} · ${date.formatTime(new Date(row.createdAt))}`}
          />
        ))}
      </View>
    </Sheet>
  );
}
