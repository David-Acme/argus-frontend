import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ConversationRow } from '@/features/conversations/components/conversation-row';
import { useConversations } from '@/features/conversations/hooks/use-conversations';

export default function ConversationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow(60000);
  const conversations = useConversations();

  const open = useCallback((counterpartId: number) => router.push(`/conversations/${counterpartId}`), [router]);

  return (
    <AppScreen
      header={
        <ScreenHeader
          title={t('screens.conversations.title')}
          subtitle={t('screens.conversations.subtitle')}
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }>
      {conversations.length === 0 ? (
        <EmptyState
          icon="messages-square"
          title={t('screens.conversations.empty')}
          hint={t('screens.conversations.empty-hint')}
        />
      ) : (
        <View className="bg-card -mx-1 gap-0.5 rounded-3xl p-1 shadow-sm shadow-black/[0.06]">
          {conversations.map((summary) => (
            <ConversationRow key={summary.counterpartId} summary={summary} now={now} onOpen={open} />
          ))}
        </View>
      )}
    </AppScreen>
  );
}
