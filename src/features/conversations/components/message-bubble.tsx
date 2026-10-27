import { clsx } from 'clsx';
import { View } from 'react-native';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { isPendingRecordId } from '@/shared/libs/optimistic';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import type { PresenceState } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { chatErrorMessage } from '@/features/conversations/model/assistant-chat-errors';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { DELIVERY_STATE_KEYS, LEG_KEYS } from '@/features/conversations/model/conversation-labels';
import { deliveryStateOf, legOf, quoted } from '@/features/conversations/model/conversation-thread';

export type BubblePresence = { state: PresenceState; live: boolean };

export type MessageBubbleProps = {
  message: IConversationMessageCacheRow;
  repliedBody: string | null;
  mark?: ChatMark;
  groupStart?: boolean;
  groupEnd?: boolean;
  presence?: BubblePresence | null;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

type FailedProps = { mark: ChatMark; body: string } & Pick<
  MessageBubbleProps,
  'onRetry' | 'onDismiss'
>;

const MINE = { maxWidth: '80%' } as const;

const THEIRS = { maxWidth: '92%' } as const;

function Failed({ mark, body, onRetry, onDismiss }: FailedProps) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row flex-wrap items-center justify-end gap-2 pt-1">
      <Icon name="alert" size="small" tone="alert" />
      <Text variant="caption" tone="alert">
        {t('screens.conversations.chat.failed', { reason: chatErrorMessage(mark.error, t) })}
      </Text>
      {onDismiss ? (
        <Button
          compact
          variant="ghost"
          label={{
            shown: t('screens.conversations.chat.dismiss'),
            spoken: t('screens.conversations.chat.dismiss-label', { body: quoted(body) }),
          }}
          onPress={() => onDismiss(mark.clientId)}
        />
      ) : null}
      {onRetry ? (
        <Button
          compact
          label={{
            shown: t('screens.conversations.chat.retry'),
            spoken: t('screens.conversations.chat.retry-label', { body: quoted(body) }),
          }}
          onPress={() => onRetry(mark.clientId)}
        />
      ) : null}
    </View>
  );
}

function useBubbleMeta(message: IConversationMessageCacheRow, sending: boolean): string {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const time = date.formatTime(new Date(message.createdAt));
  if (sending) return t('screens.conversations.chat.sending');
  const leg = legOf(message);
  const state = deliveryStateOf(message);
  const where = state ? t(DELIVERY_STATE_KEYS[state]) : leg ? t(LEG_KEYS[leg]) : null;
  return where ? t('screens.conversations.meta', { where, time }) : time;
}

export function MessageBubble({
  message,
  repliedBody,
  mark,
  groupStart = true,
  groupEnd = true,
  presence = null,
  onRetry,
  onDismiss,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const outgoing = message.direction === 'out';
  const visitor = message.kind === 'visitor';
  const pending = isPendingRecordId(message.id) || mark?.status === 'sending';
  const failed = mark?.status === 'failed' ? mark : null;
  const meta = useBubbleMeta(message, outgoing && pending && failed === null);
  const reply =
    repliedBody === null
      ? null
      : t('screens.conversations.reply-to', { body: quoted(repliedBody) });
  const label = [visitor ? t('screens.conversations.visitor') : null, reply, message.body, meta]
    .filter((part): part is string => Boolean(part))
    .join('. ');
  const argus = presence !== null;
  return (
    <View
      className={clsx(
        groupStart ? 'pt-3' : 'pt-1',
        outgoing ? 'items-end' : 'items-start',
        pending && 'opacity-60'
      )}>
      <View
        accessible
        accessibilityLabel={label}
        className="flex-row items-end gap-2"
        style={outgoing ? MINE : THEIRS}>
        {argus ? (
          <View className="size-presence-bubble">
            {groupEnd ? (
              <Presence state={presence.state} size={size.presenceBubble} paused={!presence.live} />
            ) : null}
          </View>
        ) : null}
        <View
          className={clsx(
            'min-w-0 shrink gap-1 px-4 py-2',
            outgoing ? 'bg-ink rounded-media' : 'bg-surface border-line rounded-media border',
            groupEnd && (outgoing ? 'rounded-br-key' : 'rounded-bl-key')
          )}>
          {visitor ? (
            <Text variant="caption" tone="2">
              {t('screens.conversations.visitor')}
            </Text>
          ) : null}
          {reply ? (
            <Text variant="caption" tone={outgoing ? 'on-ink' : '3'} numberOfLines={1}>
              {reply}
            </Text>
          ) : null}
          <Text variant="body" tone={outgoing ? 'on-ink' : 'default'}>
            {message.body}
          </Text>
        </View>
      </View>
      {groupEnd && failed === null ? (
        <View className={clsx('px-1 pt-1', argus && 'pl-9')}>
          <Text variant="caption" tone="3">
            {meta}
          </Text>
        </View>
      ) : null}
      {failed ? (
        <Failed mark={failed} body={message.body} onRetry={onRetry} onDismiss={onDismiss} />
      ) : null}
    </View>
  );
}
