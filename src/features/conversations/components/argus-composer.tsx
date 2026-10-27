import { useIsFocused } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { ASSISTANT_CHAT_MAX_CHARS } from '@/features/voice';
import type { ArgusTalk } from '@/features/voice';
import { ThreadComposer } from '@/features/conversations/components/thread-composer';
import type { RecordedNote } from '@/features/conversations/model/voice-note';

export type ArgusComposerProps = {
  talk: ArgusTalk;
  heard: string;
  busy: boolean;
  readDraft: () => string;
  onDraft: (draft: string) => void;
  onSend: (text: string) => boolean;
  onNote: (note: RecordedNote) => void;
};

type ListeningProps = { heard: string; onStop: () => void; onCancel: () => void };

function Listening({ heard, onStop, onCancel }: ListeningProps) {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const said = heard.trim();
  const leave = useEffectEvent(onCancel);

  useEffect(() => {
    if (!focused) leave();
  }, [focused]);
  useEffect(() => () => leave(), []);

  return (
    <View className="flex-row items-center gap-2">
      <View
        role="status"
        accessibilityLiveRegion="polite"
        className="bg-surface border-line rounded-media min-h-field min-w-0 flex-1 flex-row items-center gap-2 border px-4">
        <Presence state="listen" size={size.presenceBubble} />
        <View className="min-w-0 flex-1">
          <Text variant="feed" tone={said ? 'default' : '2'} numberOfLines={2}>
            {said ? `«${said}»` : t('screens.conversations.composer.listening')}
          </Text>
        </View>
      </View>
      <Button
        iconOnly
        icon="x"
        label={t('screens.conversations.composer.cancel')}
        onPress={onCancel}
      />
      <Button
        iconOnly
        ink
        icon="send"
        label={t('screens.conversations.composer.stop')}
        onPress={onStop}
      />
    </View>
  );
}

export function ArgusComposer({
  talk,
  heard,
  busy,
  readDraft,
  onDraft,
  onSend,
  onNote,
}: ArgusComposerProps) {
  const { t } = useTranslation();
  if (talk.stage === 'listening')
    return (
      <Listening
        heard={heard}
        onStop={() => talk.finish(true)}
        onCancel={() => talk.finish(false)}
      />
    );
  return (
    <ThreadComposer
      placeholder={t('screens.conversations.chat.placeholder')}
      sendLabel={t('screens.conversations.chat.send')}
      maxChars={ASSISTANT_CHAT_MAX_CHARS}
      readDraft={readDraft}
      onDraft={onDraft}
      onSend={onSend}
      onNote={onNote}
      busy={busy}
    />
  );
}
