import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import {
  SLIDE_CANCEL_PX,
  SLIDE_LOCK_PX,
} from '@/features/conversations/constants/voice-note.constant';
import { holdDecision } from '@/features/conversations/model/hold-record';
import type { HoldDecision } from '@/features/conversations/model/hold-record';

export type MicHoldProps = {
  holding: boolean;
  onStart: () => void;
  onDrag: (decision: HoldDecision, dx: number) => void;
  onRelease: () => void;
  onActivate: () => void;
};

const LIMITS = { cancelPx: SLIDE_CANCEL_PX, lockPx: SLIDE_LOCK_PX } as const;

const ACTIONS = [{ name: 'activate' as const }];

const LOCK_HINT = { position: 'absolute', right: 0, bottom: '100%' } as const;

export function MicHold({ holding, onStart, onDrag, onRelease, onActivate }: MicHoldProps) {
  const { t } = useTranslation();
  const gesture = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .runOnJS(true)
    .onBegin(() => {
      feedback('impactLight');
      onStart();
    })
    .onUpdate((event) =>
      onDrag(
        holdDecision({ dx: event.translationX, dy: event.translationY }, LIMITS),
        event.translationX
      )
    )
    .onFinalize(onRelease);
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
