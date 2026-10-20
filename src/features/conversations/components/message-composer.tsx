import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { voiceCallSupported } from '@/features/voice';
import { composerMode } from '@/features/conversations/model/composer';

type MessageComposerProps = {
  name: string;
  argus: boolean;
};

export function MessageComposer({ name, argus }: MessageComposerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const mode = composerMode({ argus, voiceAllowed: has(CAPABILITY.assistantVoice), voiceSupported: voiceCallSupported() });
  const prompt =
    mode === 'argus-by-voice'
      ? t('screens.conversations.composer.argus-prompt')
      : t('screens.conversations.composer.relay-prompt', { name });
  const note =
    mode === 'no-voice'
      ? t('screens.conversations.composer.no-voice', { name })
      : argus
        ? t('screens.conversations.argus-hint')
        : t('screens.conversations.composer.typing-soon');

  const talk = () => router.push('/call');

  return (
    <View className="mt-3 gap-1.5">
      {mode === 'no-voice' ? null : (
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={prompt}
            accessibilityHint={t('screens.conversations.composer.opens-call')}
            onPress={talk}
            className="bg-card border-border min-h-11 min-w-0 flex-1 flex-row items-center rounded-3xl border px-4 py-2 active:opacity-70">
            <Text variant="body" className="text-muted-foreground min-w-0 flex-1" numberOfLines={2}>
              {prompt}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screens.conversations.composer.talk')}
            onPress={talk}
            hitSlop={4}
            className="bg-interactive size-11 items-center justify-center rounded-full active:opacity-80">
            <Icon name="mic" className="text-foreground-on-interactive size-5" />
          </Pressable>
        </View>
      )}
      <Text variant="caption" className="text-foreground-secondary px-1">
        {note}
      </Text>
    </View>
  );
}
