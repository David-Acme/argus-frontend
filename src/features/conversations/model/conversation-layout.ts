import type { WindowClass } from '@/shared/theme';

export type ConversationLayout = 'desk' | 'phone';

export function conversationLayoutOf(windowClass: WindowClass): ConversationLayout {
  return windowClass === 'expanded' || windowClass === 'wide' ? 'desk' : 'phone';
}
