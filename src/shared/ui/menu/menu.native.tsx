import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { feedback } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import type {
  ButtonMenuProps,
  ContextMenuProps,
  MenuItems,
  MenuProps,
  SheetSlot,
} from './menu-types';

type SheetListProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  items: MenuItems;
  sheet: SheetSlot;
};

type LongPressProps = { onLongPress: () => void; children: ReactNode };

function SheetList({ open, onClose, label, items, sheet: Sheet }: SheetListProps) {
  return (
    <Sheet open={open} onClose={onClose} title={label} variant="list">
      {items.map((item) => (
        <Row
          key={item.label}
          title={item.label}
          danger={item.destructive}
          leading={
            item.icon ? (
              <Icon name={item.icon} tone={item.destructive ? 'alert' : 'text'} />
            ) : undefined
          }
          onPress={() => {
            onClose();
            item.onPress();
          }}
        />
      ))}
    </Sheet>
  );
}

function LongPress({ onLongPress, children }: LongPressProps) {
  const gesture = Gesture.LongPress()
    .runOnJS(true)
    .onStart(() => {
      feedback('impactLight');
      onLongPress();
    });
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{children}</View>
    </GestureDetector>
  );
}

function ButtonMenu({ label, items, icon = 'more', sheet }: ButtonMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button iconOnly icon={icon} label={label} onPress={() => setOpen(true)} />
      <SheetList
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        items={items}
        sheet={sheet}
      />
    </>
  );
}

function ContextMenu({ label, items, sheet, children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LongPress onLongPress={() => setOpen(true)}>{children}</LongPress>
      <SheetList
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        items={items}
        sheet={sheet}
      />
    </>
  );
}

export function Menu(props: MenuProps) {
  if ('context' in props) return <ContextMenu {...props} />;
  return <ButtonMenu {...props} />;
}
