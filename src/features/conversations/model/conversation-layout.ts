import type { WindowClass } from '@/shared/theme';
import type { HeightClass } from '@/shared/theme/height-layout';
import { size } from '@/shared/theme/tokens';

export type ConversationLayout = 'desk' | 'phone';

export function conversationLayoutOf(windowClass: WindowClass): ConversationLayout {
  return windowClass === 'expanded' || windowClass === 'wide' ? 'desk' : 'phone';
}

export function emptyMarkSizeOf(heightClass: HeightClass, landscape: boolean): number {
  if (landscape || heightClass === 'tiny') return size.presenceMark;
  return heightClass === 'short' ? size.presenceWelcomeTiny : size.presenceThreadEmpty;
}
