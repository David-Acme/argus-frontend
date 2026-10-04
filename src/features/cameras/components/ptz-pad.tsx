import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { cn } from '@/shared/libs/utils';
import { PTZ_HOLD_DELAY_MS, type PtzDirection } from '@/features/cameras/model/camera-ptz';

type PtzPadProps = {
  labels: Record<PtzDirection, string>;
  limit?: PtzDirection | null;
  compact?: boolean;
  onStep: (direction: PtzDirection) => void;
  onHoldStart: (direction: PtzDirection) => void;
  onHoldEnd: () => void;
};

type PadButtonProps = {
  direction: PtzDirection;
  icon: IconName;
  label: string;
  atLimit: boolean;
  compact: boolean;
  onStep: (direction: PtzDirection) => void;
  onHoldStart: (direction: PtzDirection) => void;
  onHoldEnd: () => void;
};

function PadButton({ direction, icon, label, atLimit, compact, onStep, onHoldStart, onHoldEnd }: PadButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const pressIn = () => {
    holding.current = false;
    timer.current = setTimeout(() => {
      holding.current = true;
      onHoldStart(direction);
    }, PTZ_HOLD_DELAY_MS);
  };

  const pressOut = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (holding.current) onHoldEnd();
    else onStep(direction);
    holding.current = false;
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: atLimit }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      className={cn(
        'items-center justify-center rounded-2xl shadow-sm shadow-black/[0.08] active:opacity-70 web:hover:bg-surface-secondary',
        compact ? 'bg-card/90 size-11' : 'bg-card size-12',
        atLimit ? 'opacity-40' : undefined,
      )}>
      <Icon name={icon} className="text-foreground size-5" />
    </Pressable>
  );
}

export function PtzPad({ labels, limit = null, compact = false, onStep, onHoldStart, onHoldEnd }: PtzPadProps) {
  const button = (direction: PtzDirection, icon: IconName) => (
    <PadButton
      direction={direction}
      icon={icon}
      label={labels[direction]}
      atLimit={limit === direction}
      compact={compact}
      onStep={onStep}
      onHoldStart={onHoldStart}
      onHoldEnd={onHoldEnd}
    />
  );

  return (
    <View className="items-center gap-2">
      {button('up', 'chevron-up')}
      <View className="flex-row items-center gap-2">
        {button('left', 'chevron-left')}
        <View className={compact ? 'size-11' : 'size-12'} />
        {button('right', 'chevron-right')}
      </View>
      {button('down', 'chevron-down')}
    </View>
  );
}
