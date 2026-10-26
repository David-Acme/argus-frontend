import { lazyScreen } from '@/shared/libs/lazy-screen';
export const ConversationsScreen = lazyScreen(
  () => import('./screens/conversation-screens'),
  'ConversationsScreen'
);
export const ConversationThreadScreen = lazyScreen(
  () => import('./screens/conversation-screens'),
  'ConversationThreadScreen'
);
export { useConversationUnread } from './hooks/use-conversations';
