import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useHeightLayout } from '@/shared/theme';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { emptyMarkSizeOf } from '@/features/conversations/model/conversation-layout';

export function ArgusEmpty() {
  const { t } = useTranslation();
  const { heightClass, landscape } = useHeightLayout();
  return (
    <View className="min-h-0 flex-1 items-center justify-center gap-4 px-4 py-6">
      <Presence state="idle" size={emptyMarkSizeOf(heightClass, landscape)} />
      <View className="items-center gap-1">
        <Text variant="headline" heading={2} align="center">
          {t('screens.conversations.argus-empty')}
        </Text>
        <Text variant="meta" tone="2" align="center">
          {t('screens.conversations.argus-empty-hint')}
        </Text>
      </View>
    </View>
  );
}
