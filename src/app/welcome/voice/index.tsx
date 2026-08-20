import { useOnboardingStore, useAvatarStore } from '@/core/stores';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useVoiceSession } from '@/shared/hooks/use-voice-session';
import { useTranslation } from '@/shared/hooks/use-translation';
import { IS_NATIVE } from '@/shared/constants';
import type { AvatarState } from '@/core/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

function WebOnlyNotice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="bg-background flex-1 items-center justify-center gap-6 px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="bg-accent-soft size-16 items-center justify-center rounded-full">
        <Icon name="messages-square" className="text-accent size-8" />
      </View>
      <View className="items-center gap-2">
        <Text variant="h3" className="text-center">
          {t('screens.voice.web-only-title')}
        </Text>
        <Text className="text-foreground-secondary text-center text-sm leading-5">
          {t('screens.voice.web-only-hint')}
        </Text>
      </View>
      <Button variant="outline" size="lg" onPress={() => router.replace('/')}>
        <Text>{t('common.continue')}</Text>
      </Button>
    </View>
  );
}

export default function VoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const session = useVoiceSession();
  const { start, stop } = session;
  const avatarState = useAvatarStore((s) => s.state);
  const setAvatarState = useAvatarStore((s) => s.setState);
  const setVoiceEnabled = useOnboardingStore((s) => s.setVoiceEnabled);

  const phaseToAvatar = useCallback((phase: string): AvatarState => {
    if (phase === 'listening') return 'listening';
    if (phase === 'speaking') return 'speaking';
    if (phase === 'thinking') return 'thinking';
    if (phase === 'error') return 'error';
    return 'idle';
  }, []);

  const handleSkip = useCallback(() => {
    session.skip();
    setVoiceEnabled(true);
    router.replace('/');
  }, [session, setVoiceEnabled, router]);

  useEffect(() => {
    void start();
    return () => {
      stop();
      setAvatarState('idle');
    };
  }, [start, stop, setAvatarState]);
  useEffect(() => {
    const next = phaseToAvatar(session.phase);
    if (next !== avatarState) setAvatarState(next);
  }, [session.phase, avatarState, setAvatarState, phaseToAvatar]);

  useEffect(() => {
    if (session.phase === 'done') {
      setVoiceEnabled(true);
      router.replace('/');
    }
  }, [session.phase, setVoiceEnabled, router]);

  if (!IS_NATIVE) return <WebOnlyNotice />;

  return (
    <View
      className="bg-background flex-1 w-full max-w-md self-center items-center justify-center gap-8 px-5"
      style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }}>
      <View className="items-center gap-2">
        <Text variant="h3">{t('screens.voice.intro-title')}</Text>
        <Text className="text-foreground-secondary text-center text-sm leading-5">
          {t('screens.voice.intro-hint')}
        </Text>
      </View>

      <Avatar
        size={300}
        preview
        accessibilityLabel={t('screens.voice.intro-title')}
      />

      {session.assistantText ? (
        <View className="bg-surface-secondary max-w-[85%] rounded-xl px-4 py-3">
          <Text className="text-sm leading-5">{session.assistantText}</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Button variant="outline" size="lg" onPress={handleSkip}>
          <Icon name="skip-forward" />
          <Text>{t('screens.voice.skip')}</Text>
        </Button>
        <Text variant="muted" className="text-center">
          {t('screens.voice.not-now')}
        </Text>
      </View>
    </View>
  );
}
