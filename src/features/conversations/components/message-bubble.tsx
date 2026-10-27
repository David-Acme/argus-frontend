import { clsx } from 'clsx';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { ClearText, Text } from '@/shared/ui/text';
import { BubbleFrame } from '@/features/conversations/components/bubble-frame';
import { BubbleMeta } from '@/features/conversations/components/bubble-meta';
import { BubbleTail } from '@/features/conversations/components/bubble-tail';
import { VoiceNoteBubble } from '@/features/conversations/components/voice-note-bubble';
import { useBubbleActions } from '@/features/conversations/hooks/use-bubble-actions';
import { chatErrorMessage } from '@/features/conversations/model/assistant-chat-errors';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import {
  glyphShownOf,
  metaLabelOf,
  metaReserveOf,
} from '@/features/conversations/model/bubble-meta';
import { quoted } from '@/features/conversations/model/conversation-thread';
import {
  bubbleNoteOf,
  replyLineOf,
  spokenOf,
  STATUS_KEYS,
} from '@/features/conversations/model/conversation-labels';
import type { BubbleStatus } from '@/features/conversations/model/receipts';

export type MessageBubbleProps = {
  message: IConversationMessageCacheRow;
  repliedBody: string | null;
  status: BubbleStatus | null;
  mark?: ChatMark;
  groupStart?: boolean;
  ask?: ReactNode;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

type QuoteProps = { text: string | null };

type BubbleTextProps = {
  body: string;
  time: string;
  note: string | null;
  status: BubbleStatus | null;
};

type ResendProps = { mark: ChatMark; body: string; onRetry?: (clientId: string) => void };

const BUBBLE_MAX = { maxWidth: '78%' } as const;

function Quote({ text }: QuoteProps) {
  if (!text) return null;
  return (
    <Text variant="caption" tone="2" numberOfLines={1}>
      {text}
    </Text>
  );
}

function BubbleText({ body, time, note, status }: BubbleTextProps) {
  const reserve = metaReserveOf({ label: metaLabelOf(time, note), glyph: glyphShownOf(status) });
  return (
    <View className="min-w-0 shrink">
      <Text variant="body">
        {body}
        <ClearText variant="caption">{reserve}</ClearText>
      </Text>
      <View className="absolute right-0 bottom-0">
        <BubbleMeta time={time} note={note} status={status} />
      </View>
    </View>
  );
}

function Resend({ mark, body, onRetry }: ResendProps) {
  const { t } = useTranslation();
  if (!onRetry) return null;
  return (
    <Button
      iconOnly
      compact
      icon="refresh"
      label={t('screens.conversations.chat.retry-label', { body: quoted(body) })}
      onPress={() => onRetry(mark.clientId)}
    />
  );
}

export function MessageBubble({
  message,
  repliedBody,
  status,
  mark,
  groupStart = true,
  ask = null,
  onRetry,
  onDismiss,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [expanded, setExpanded] = useState(false);
  const mine = message.direction === 'out';
  const failed = status === 'failed' && mark ? mark : null;
  const note = bubbleNoteOf(message, t);
  const time = date.formatTime(new Date(message.createdAt));
  const voiceNote = message.voiceNote;
  const reply = replyLineOf(repliedBody, t);
  const visitor = message.kind === 'visitor' ? t('screens.conversations.visitor') : null;
  const items = useBubbleActions({
    message,
    failedId: failed?.clientId ?? null,
    transcript: voiceNote ? { expanded, toggle: () => setExpanded((open) => !open) } : null,
    onRetry,
    onDismiss,
  });
  const label = spokenOf([
    visitor,
    reply,
    voiceNote ? t('screens.conversations.note.label') : message.body,
    note,
    time,
    status ? t(STATUS_KEYS[status]) : null,
    failed ? chatErrorMessage(failed.error, t) : null,
  ]);
  return (
    <View className={clsx(groupStart ? 'pt-3' : 'pt-1', mine ? 'items-end' : 'items-start')}>
      <View className="flex-row items-center gap-1" style={BUBBLE_MAX}>
        {failed ? <Resend mark={failed} body={message.body} onRetry={onRetry} /> : null}
        <View className="min-w-0 shrink">
          <BubbleFrame items={items} label={label}>
            <View
              accessible
              accessibilityLabel={label}
              className={clsx(
                'rounded-control min-w-0 shrink gap-1 px-3 py-2',
                mine ? 'bg-bubble-own' : 'bg-surface',
                groupStart && (mine ? 'rounded-tr-none' : 'rounded-tl-none')
              )}>
              {groupStart ? (
                <BubbleTail side={mine ? 'end' : 'start'} fill={mine ? 'bubble-own' : 'surface'} />
              ) : null}
              <Quote text={visitor} />
              <Quote text={reply} />
              {voiceNote ? (
                <VoiceNoteBubble
                  note={voiceNote}
                  transcript={message.body}
                  expanded={expanded}
                  onExpand={setExpanded}
                />
              ) : null}
              {voiceNote ? (
                <View className="flex-row justify-end">
                  <BubbleMeta time={time} note={note} status={status} />
                </View>
              ) : (
                <BubbleText body={message.body} time={time} note={note} status={status} />
              )}
              {ask}
            </View>
          </BubbleFrame>
        </View>
      </View>
    </View>
  );
}
