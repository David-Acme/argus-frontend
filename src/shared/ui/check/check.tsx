import { clsx } from 'clsx';
import { View } from 'react-native';
import { inset, size } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';

export type CheckState = 'open' | 'overdue' | 'progress' | 'done';

export type CheckProps = {
  state: CheckState;
  label: string;
  onToggle?: () => void;
  testID?: string;
};

type CheckMarkProps = { state: CheckState };

const RING: Record<CheckState, string> = {
  open: 'border-text-3',
  overdue: 'border-alert',
  progress: 'border-ink',
  done: 'border-ink bg-ink',
};

const SLOP = (size.target - size.check) / 2;

const RING_WIDTH = { borderWidth: inset.control.checkBorder };

function CheckMark({ state }: CheckMarkProps) {
  return (
    <View
      className={clsx('size-check items-center justify-center rounded-full', RING[state])}
      style={RING_WIDTH}>
      {state === 'done' ? <Icon name="check" size="small" tone="on-ink" /> : null}
      {state === 'progress' ? <View className="size-dot bg-ink rounded-full" /> : null}
    </View>
  );
}

export function Check({ state, label, onToggle, testID }: CheckProps) {
  const checked = state === 'done' ? true : state === 'progress' ? 'mixed' : false;
  if (!onToggle) {
    return (
      <View role="checkbox" aria-checked={checked} aria-label={label} testID={testID}>
        <CheckMark state={state} />
      </View>
    );
  }
  return (
    <PressableSurface
      a11y={{ label, role: 'checkbox', checked }}
      onPress={onToggle}
      haptic="selection"
      pressed={{ scale: 'icon' }}
      hitSlop={SLOP}
      testID={testID}>
      <CheckMark state={state} />
    </PressableSurface>
  );
}
