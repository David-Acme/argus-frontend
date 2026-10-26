import { useState } from 'react';
import { View } from 'react-native';
import { WATCH_REPLY_MAX_CHARS } from '@/core/contracts/watch.contract';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toastServiceError } from '@/shared/libs/service-error';
import { watchService } from '@/features/watch/services/watch.service';
import {
  canReply,
  watchReplyOutcome,
  type VisitorMessage,
  type WatchReplyOutcome,
} from '@/features/watch/model/watch-notification';

type VisitorReplyProps = {
  message: VisitorMessage;
  onReplied?: () => void;
};

type SentReply = {
  outcome: WatchReplyOutcome;
  until: number | null;
};

const CONSENT_KEYS = {
  granted: 'screens.watch.consent.granted',
  declined: 'screens.watch.consent.declined',
  unanswered: 'screens.watch.consent.unanswered',
} as const;

const CLOSING_OUTCOMES: ReadonlySet<WatchReplyOutcome> = new Set(['said', 'queued', 'gone', 'closed']);

export function VisitorReply({ message, onReplied }: VisitorReplyProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const now = useNow(30000);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<SentReply | null>(null);
  const camera = message.cameraName ?? t('screens.watch.reply.hint-camera');
  const text = draft.trim();
  const open = canReply(message, now) && (sent === null || !CLOSING_OUTCOMES.has(sent.outcome));
  const timeOf = (at: number | null) => (at === null ? '' : dates.formatTime(new Date(at)));

  const outcomeLine = (() => {
    if (sent === null) return null;
    if (sent.outcome === 'said') return t('screens.watch.reply.said');
    if (sent.outcome === 'queued') return t('screens.watch.reply.queued', { camera, time: timeOf(sent.until) });
    if (sent.outcome === 'gone') return t('screens.watch.reply.gone');
    if (sent.outcome === 'closed') return t('screens.watch.reply.closed');
    if (sent.outcome === 'too-long') return t('screens.watch.reply.too-long');
    return null;
  })();

  const send = async () => {
    if (text.length === 0 || pending) return;
    setPending(true);
    try {
      const result = await watchService.reply(message.conversationId, text);
      const outcome = watchReplyOutcome(result);
      setSent({ outcome, until: result.info?.replyUntil ?? null });
      if (outcome === 'failed') toastServiceError(result.errors, t('screens.watch.reply.failed'));
      if (outcome === 'said' || outcome === 'queued') {
        setDraft('');
        onReplied?.();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <View className="w-full gap-2">
      {message.consent ? (
        <View className="flex-row items-start gap-1.5">
          <Icon name="user-check" className="text-muted-foreground mt-0.5 size-3.5" />
          <Text variant="micro" className="min-w-0 flex-1">
            {t(CONSENT_KEYS[message.consent])}
          </Text>
        </View>
      ) : null}
      {outcomeLine ? (
        <Text variant="caption" className="text-foreground-secondary">
          {outcomeLine}
        </Text>
      ) : null}
      {open ? (
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <Input
              value={draft}
              onChangeText={setDraft}
              maxLength={WATCH_REPLY_MAX_CHARS}
              placeholder={t('screens.watch.reply.placeholder')}
              accessibilityLabel={t('screens.watch.reply.label')}
              editable={!pending}
              returnKeyType="send"
              onSubmitEditing={() => void send()}
              className="flex-1"
            />
            <Button
              size="icon"
              loading={pending}
              disabled={text.length === 0}
              accessibilityLabel={t('screens.watch.reply.send')}
              onPress={() => void send()}>
              <Icon name="send" className="text-foreground-on-interactive size-5" />
            </Button>
          </View>
          <Text variant="micro">
            {t('screens.watch.reply.hint', { camera, time: timeOf(message.replyUntil) })}
            {draft.length > WATCH_REPLY_MAX_CHARS - 50
              ? ` · ${t('screens.watch.reply.count', { count: String(draft.length), max: String(WATCH_REPLY_MAX_CHARS) })}`
              : ''}
          </Text>
        </View>
      ) : sent === null && message.replyUntil !== null ? (
        <Text variant="micro">{t('screens.watch.reply.expired')}</Text>
      ) : null}
    </View>
  );
}
