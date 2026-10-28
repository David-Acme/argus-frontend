import { useEffect, useRef } from 'react';
import { View, type TextInput } from 'react-native';
import { motion } from '@/shared/theme';
import { Field } from '@/shared/ui/field';
import { PressableSurface } from '@/shared/ui/pressable';

export type SheetSearchFieldProps = {
  label: string;
  value: string;
  open: boolean;
  onOpen: () => void;
  onChangeText: (text: string) => void;
};

const INERT = { pointerEvents: 'none' } as const;

export function SheetSearchField({
  label,
  value,
  open,
  onOpen,
  onChangeText,
}: SheetSearchFieldProps) {
  const input = useRef<TextInput>(null);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => input.current?.focus(), motion.duration.slow);
    return () => clearTimeout(timer);
  }, [open]);
  if (open)
    return <Field ref={input} placeholder={label} value={value} onChangeText={onChangeText} />;
  return (
    <PressableSurface a11y={{ label, role: 'button' }} onPress={onOpen}>
      <View style={INERT}>
        <Field placeholder={label} value={value} onChangeText={onChangeText} />
      </View>
    </PressableSurface>
  );
}
