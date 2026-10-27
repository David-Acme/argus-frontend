import { Share } from 'react-native';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { hasMenuItems } from '@/shared/ui/menu';
import type { MenuItem, MenuItems } from '@/shared/ui/menu';
import { serverIdOf } from '@/features/conversations/model/receipts';

export type BubbleActionsInput = {
  message: IConversationMessageCacheRow;
  failedId: string | null;
  transcript: { expanded: boolean; toggle: () => void } | null;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

const clipboard = (): Clipboard | null =>
  typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;

export function useBubbleActions({
  message,
  failedId,
  transcript,
  onRetry,
  onDismiss,
}: BubbleActionsInput): MenuItems | null {
  const { t } = useTranslation();
  const text = message.body.trim();
  const board = clipboard();

  const copy = async () => {
    if (board) {
      await board.writeText(text).catch(() => undefined);
      toast.success(t('screens.conversations.actions.copied'));
      return;
    }
    await Share.share({ message: text }).catch(() => undefined);
  };

  const words = {
    title: t('screens.conversations.actions.delete-title'),
    body: t('screens.conversations.actions.delete-description'),
    confirmLabel: t('screens.conversations.actions.delete-confirm'),
  };

  const items: MenuItem[] = [];
  if (text.length > 0 && !message.voiceNote)
    items.push({
      label: board
        ? t('screens.conversations.actions.copy')
        : t('screens.conversations.actions.share'),
      icon: board ? 'copy' : 'share',
      family: 'share',
      onPress: () => void copy(),
    });
  if (failedId !== null && onRetry)
    items.push({
      label: t('screens.conversations.actions.resend'),
      icon: 'refresh',
      family: 'state',
      onPress: () => onRetry(failedId),
    });
  if (transcript && text.length > 0)
    items.push({
      label: transcript.expanded
        ? t('screens.conversations.note.hide-transcript')
        : t('screens.conversations.note.show-transcript'),
      icon: 'transcript',
      family: 'view',
      onPress: transcript.toggle,
    });
  if (failedId !== null)
    items.push({
      label: t('screens.conversations.actions.delete'),
      icon: 'trash',
      destructive: true,
      confirm: 'by-action',
      onPress: () => onDismiss?.(failedId),
    });
  else if (serverIdOf(message.id) !== null)
    items.push({
      label: t('screens.conversations.actions.delete'),
      icon: 'trash',
      destructive: true,
      confirm: words,
      onPress: () => conversationService.forgetMessage(message.id),
    });
  return hasMenuItems(items) ? items : null;
}
