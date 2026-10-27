import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import {
  SLIDE_CANCEL_PX,
  SLIDE_LOCK_PX,
} from '@/features/conversations/constants/voice-note.constant';
import { holdDecision } from '@/features/conversations/model/hold-record';
import type { HoldDecision, HoldVerdict } from '@/features/conversations/model/hold-record';

export type MicHoldProps = {
  holding: boolean;
  onStart: () => void;
  drag: SharedValue<number>;
  onDecide: (verdict: HoldVerdict) => void;
  onRelease: () => void;
  onActivate: () => void;
};

const LIMITS = { cancelPx: SLIDE_CANCEL_PX, lockPx: SLIDE_LOCK_PX } as const;

const ACTIONS = [{ name: 'activate' as const }];

const LOCK_HINT = { position: 'absolute', right: 0, bottom: '100%' } as const;

export function MicHold({ holding, drag, onStart, onDecide, onRelease, onActivate }: MicHoldProps) {
  const { t } = useTranslation();
  const decided = useSharedValue<HoldDecision>('hold');
  const begin = () => {
    feedback('impactLight');
    onStart();
  };
  const gesture = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      'worklet';
      decided.set('hold');
      drag.set(0);
      scheduleOnRN(begin);
    })
    .onUpdate((event) => {
      'worklet';
      drag.set(Math.min(0, event.translationX));
      const decision = holdDecision({ dx: event.translationX, dy: event.translationY }, LIMITS);
      if (decision === 'hold' || decision === decided.get()) return;
      decided.set(decision);
      scheduleOnRN(onDecide, decision);
    })
    .onFinalize(() => {
      'worklet';
      scheduleOnRN(onRelease);
    });
  return (
    <View>
      {holding ? (
        <View
          style={LOCK_HINT}
          pointerEvents="none"
          className="bg-surface border-line mb-2 items-center gap-1 rounded-full border px-2 py-3">
          <Icon name="lock" size="small" tone="text-2" />
          <Icon name="chevu" size="small" tone="text-3" />
        </View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <View
          accessible
          role="button"
          accessibilityLabel={t('screens.conversations.note.hold')}
          accessibilityActions={ACTIONS}
          onAccessibilityAction={onActivate}
          collapsable={false}
          className="bg-ink size-target items-center justify-center rounded-full">
          <Icon name="mic" tone="on-ink" />
        </View>
      </GestureDetector>
    </View>
  );
}
