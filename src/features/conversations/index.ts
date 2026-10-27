import { lazyScreen } from '@/shared/libs/lazy-screen';
import { useConversationsWarm } from './hooks/use-conversations-warm';

export const ConversationsScreen = lazyScreen(
  () => import('./screens/conversation-screens'),
  'ConversationsScreen'
);
export const ConversationThreadScreen = lazyScreen(
  () => import('./screens/conversation-screens'),
  'ConversationThreadScreen'
);

const preloadScreens = async (): Promise<void> => {
  await Promise.all([ConversationsScreen.preload(), ConversationThreadScreen.preload()]);
};

export function useConversationRuntime(): void {
  useConversationsWarm({ preload: preloadScreens });
}
