import { useIsFocused } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { ASSISTANT_CHAT_MAX_CHARS } from '@/features/voice';
import type { ArgusTalk } from '@/features/voice';
import {
  charactersOf,
  composerButtonOf,
  sendableMessage,
  showsCounter,
} from '@/features/conversations/model/composer';

export type ArgusComposerProps = {
  talk: ArgusTalk;
  heard: string;
  busy: boolean;
  readDraft: () => string;
  onDraft: (draft: string) => void;
  onSend: (text: string) => boolean;
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
}: ArgusComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(readDraft);
  const body = sendableMessage(draft, ASSISTANT_CHAT_MAX_CHARS);
  const characters = charactersOf(draft);
  const button = composerButtonOf({
    typed: draft.trim().length > 0,
    listening: talk.stage === 'listening',
    canListen: talk.canListen,
  });

  const change = (next: string) => {
    setDraft(next);
    onDraft(next);
  };

  const send = () => {
    if (body === null || busy) return;
    if (onSend(body)) change('');
  };

  if (button === 'stop')
    return (
      <Listening
        heard={heard}
        onStop={() => talk.finish(true)}
        onCancel={() => talk.finish(false)}
      />
    );
  return (
    <View className="gap-1">
      <View className="flex-row items-end gap-2">
        <View className="min-w-0 flex-1">
          <Field
            kind="message"
            placeholder={t('screens.conversations.chat.placeholder')}
            value={draft}
            onChangeText={change}
            submit={{ key: 'done', onSubmit: send }}
          />
        </View>
        {button === 'mic' ? (
          <Button
            iconOnly
            ink
            icon="mic"
            label={t('screens.conversations.composer.talk')}
            onPress={() => talk.start('tap')}
          />
        ) : (
          <Button
            iconOnly
            ink
            icon="send"
            label={t('screens.conversations.chat.send')}
            onPress={send}
            disabled={body === null || busy}
          />
        )}
      </View>
      {showsCounter(characters, ASSISTANT_CHAT_MAX_CHARS) ? (
        <View className="items-end">
          <Text variant="caption" tone={characters > ASSISTANT_CHAT_MAX_CHARS ? 'alert' : '3'}>
            {t('screens.conversations.composer.count', {
              count: String(characters),
              max: String(ASSISTANT_CHAT_MAX_CHARS),
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
