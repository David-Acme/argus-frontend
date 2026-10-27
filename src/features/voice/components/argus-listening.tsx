import { clsx } from 'clsx';
import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { VoiceActionRecord } from '@/core/types';
import { ASSISTANT_THREAD_HREF } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { layout, size, useEffects, useThemeTokens, useWindowLayout } from '@/shared/theme';
import { Chip } from '@/shared/ui/chip';
import type { ChipTone } from '@/shared/ui/chip';
import { Icon } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { ToastCard } from '@/shared/ui/toast';
import { HOLD_FAILURE_WORDS } from '@/features/voice/constants/hold.constant';
import { useVoiceHeard } from '@/features/voice/hooks/use-voice-heard';
import {
  HOLD_FAILURE_SHOWN_MS,
  holdTalkFailureOf,
  holdTalkInline,
} from '@/features/voice/model/hold-talk';
import type { HoldTalkAnswer } from '@/features/voice/model/hold-talk';
import { voiceActionLabel } from '@/features/voice/model/voice-action-label';
import { useHoldTalkStore } from '@/features/voice/stores/hold-talk.store';

type SlotProps = { above?: boolean; children: ReactNode };

type HeardProps = { text: string };

type AnswerProps = { answer: HoldTalkAnswer; onOpen: () => void };

type FailureProps = { error: string | null };

const ACTION_TONE: Readonly<Record<VoiceActionRecord['status'], ChipTone>> = {
  pending: 'default',
  done: 'ok',
  failed: 'alert',
};

const CARD = { maxWidth: layout.dialog };

const OUTSIDE_ID = 'argus-listening-outside';

function Slot({ above = false, children }: SlotProps) {
  const { navigation } = useWindowLayout();
  const bar = navigation === 'bar';
  return (
    <View
      pointerEvents="box-none"
      className={clsx(
        'px-toast-edge absolute inset-x-0 items-center',
        bar ? (above ? 'bottom-nav-cap-bottom pb-12' : 'bottom-toast-offset') : 'bottom-toast-edge'
      )}>
      <View pointerEvents="box-none" className="w-full items-center" style={CARD}>
        {children}
      </View>
    </View>
  );
}

function Backdrop() {
  const dispatch = useHoldTalkStore((state) => state.dispatch);
  return (
    <View
      testID={OUTSIDE_ID}
      className="absolute inset-0"
      onStartShouldSetResponder={() => true}
      onResponderRelease={() => dispatch({ type: 'dismiss' })}
    />
  );
}

function Heard({ text }: HeardProps) {
  const { reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  const pill = { boxShadow: elevation.cap };
  if (text.trim() === '') return null;
  return (
    <Slot above>
      <View
        accessibilityLiveRegion="polite"
        style={pill}
        className={clsx(
          'rounded-toast px-nav-cap-x py-nav-cap-y pointer-events-none',
          reduceTransparency ? 'bg-surface' : 'web:glass-cap bg-glass'
        )}>
        <Text variant="feed" align="center" numberOfLines={2}>
          {`«${text.trim()}»`}
        </Text>
      </View>
    </Slot>
  );
}

function Sending({ text }: HeardProps) {
  const { t } = useTranslation();
  const { elevation } = useThemeTokens();
  const shadow = { boxShadow: elevation.float };
  const said = text.trim();
  return (
    <Slot>
      <View
        role="status"
        accessibilityLiveRegion="polite"
        aria-label={t('screens.voice.status-thinking')}
        style={shadow}
        className="rounded-toast bg-surface py-toast-y pr-toast-start pl-toast-start min-h-target-min w-full flex-row items-center gap-2">
        <Presence state="think" size={size.presenceThink} />
        <View className="min-w-0 flex-1">
          <Text variant="feed" tone="2" numberOfLines={2}>
            {said ? `«${said}»` : t('screens.voice.status-thinking')}
          </Text>
        </View>
      </View>
    </Slot>
  );
}

function Answer({ answer, onOpen }: AnswerProps) {
  const copy = useTranslation();
  const { t } = copy;
  const { elevation } = useThemeTokens();
  const shadow = { boxShadow: elevation.float };
  const action = answer.action;
  const label = action ? voiceActionLabel(action, copy) : null;
  return (
    <Slot>
      <View
        accessibilityLiveRegion="polite"
        style={shadow}
        className="rounded-toast bg-surface w-full">
        <PressableSurface
          a11y={{ label: `${answer.reply} ${t('screens.voice.hold.open-thread')}`, role: 'button' }}
          onPress={onOpen}
          pressed={{ scale: 'surface' }}
          className="rounded-toast pt-toast-error-top pr-toast-error-end pb-toast-error-bottom pl-toast-error-start flex-row items-start gap-2">
          <Presence state="happy" size={size.presenceThink} />
          <View className="min-w-0 flex-1 gap-2">
            <Text variant="feed" numberOfLines={3}>
              {answer.reply}
            </Text>
            {action && label ? <Chip label={label} tone={ACTION_TONE[action.status]} /> : null}
          </View>
          <Icon name="chev" size="small" tone="text-3" />
        </PressableSurface>
      </View>
    </Slot>
  );
}

function Failure({ error }: FailureProps) {
  const { t } = useTranslation();
  const dispatch = useHoldTalkStore((state) => state.dispatch);
  const words = HOLD_FAILURE_WORDS[holdTalkFailureOf(error)];

  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'dismiss' }), HOLD_FAILURE_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <Slot>
      <View className="w-full">
        <ToastCard
          kind="error"
          icon="mic"
          title={t(words.title)}
          body={words.body ? t(words.body) : undefined}
        />
      </View>
    </Slot>
  );
}

export function ArgusListening() {
  const router = useRouter();
  const pathname = usePathname();
  const hold = useHoldTalkStore((state) => state.hold);
  const dispatch = useHoldTalkStore((state) => state.dispatch);
  const heard = useVoiceHeard();

  const open = () => {
    dispatch({ type: 'dismiss' });
    router.navigate(ASSISTANT_THREAD_HREF);
  };

  if (holdTalkInline(pathname)) return null;
  if (hold.stage === 'listening') return <Heard text={heard} />;
  if (hold.stage === 'sending') return <Sending text={heard} />;
  if (hold.stage === 'answered' && hold.answer) {
    return (
      <>
        <Backdrop />
        <Answer answer={hold.answer} onOpen={open} />
      </>
    );
  }
  if (hold.stage === 'failed') {
    return (
      <>
        <Backdrop />
        <Failure error={hold.error} />
      </>
    );
  }
  return null;
}
