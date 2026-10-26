import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useVoiceCallActive } from '@/features/voice/hooks/use-voice-call-active';
import {
  argusCallSupported,
  voiceCallSupported,
  voiceService,
} from '@/features/voice/services/voice';
import { useHoldTalkStore } from '@/features/voice/stores/hold-talk.store';
import {
  HOLD_TICK_MS,
  holdTalkCanListen,
  holdTalkLive,
  holdTalkMutes,
  holdTalkSessionEnds,
  holdTalkStartOptions,
  holdTalkVoiceOf,
  type HoldTalkStage,
} from '@/features/voice/model/hold-talk';
import { ASSISTANT_THREAD_HREF, CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { feedback } from '@/shared/theme';
import type { NavVoice } from '@/shared/ui/nav';

export type ArgusVoice = { voice: NavVoice; listening: boolean };

function useHoldTalkSession(stage: HoldTalkStage): void {
  const dispatch = useHoldTalkStore((state) => state.dispatch);

  useEffect(() => {
    const unsubscribe = useHoldTalkStore.subscribe((state, previous) => {
      if (holdTalkSessionEnds(previous.hold, state.hold)) voiceService.stop();
      if (state.hold.stage === 'failed' && previous.hold.stage !== 'failed') feedback('warning');
    });
    return () => {
      dispatch({ type: 'dismiss' });
      unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    if (stage !== 'listening' && stage !== 'sending') return;
    const look = () => {
      const voice = holdTalkVoiceOf(voiceService.snapshot);
      dispatch({ type: 'observe', voice, at: Date.now() });
      if (holdTalkMutes(stage, voice) && !voiceService.snapshot.muted) voiceService.setMuted(true);
    };
    look();
    const unsubscribe = voiceService.subscribe(look);
    const tick = setInterval(look, HOLD_TICK_MS);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
  }, [stage, dispatch]);
}

export function useArgusVoice(): ArgusVoice {
  const router = useRouter();
  const { has } = useCapabilities();
  const hold = useHoldTalkStore((state) => state.hold);
  const dispatch = useHoldTalkStore((state) => state.dispatch);
  const live = holdTalkLive(hold);
  const callActive = useVoiceCallActive();
  useHoldTalkSession(hold.stage);

  const voice: NavVoice = {
    onOpenChat: () => router.navigate(ASSISTANT_THREAD_HREF),
    canListen: holdTalkCanListen({
      allowed: has(CAPABILITY.assistantVoice),
      supported: argusCallSupported(),
      callActive,
      live,
    }),
    onListenStart: () => {
      dispatch({ type: 'start' });
      if (live) voiceService.stop();
      void voiceService.start(holdTalkStartOptions(voiceCallSupported()));
    },
    onListenEnd: (send) => dispatch({ type: 'release', send, at: Date.now() }),
  };
  return { voice, listening: hold.stage === 'listening' };
}
