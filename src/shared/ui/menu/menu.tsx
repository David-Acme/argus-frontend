import { useState } from 'react';
import { hasFinePointer, useWindowLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { AnchoredButton, AnchoredContext } from './menu-anchored';
import { MenuHold } from './menu-hold';
import { menuForm, type MenuForm } from './menu-model';
import { MenuSheet } from './menu-sheet';
import type { ButtonMenuProps, ContextMenuProps, MenuProps, MenuRun } from './menu-types';
import { useMenuRun } from './use-menu-run';

type FormProps = { form: MenuForm; onRun: MenuRun };

function ButtonMenu({
  label,
  items,
  icon = 'more',
  item,
  form,
  onRun,
}: ButtonMenuProps & FormProps) {
  const [open, setOpen] = useState(false);
  const [only, ...rest] = items;
  if (rest.length === 0)
    return <Button iconOnly icon={only.icon} label={only.label} onPress={() => onRun(only)} />;
  if (!item || form === 'anchored')
    return <AnchoredButton label={label} icon={icon} items={items} onRun={onRun} />;
  return (
    <>
      <Button iconOnly icon={icon} label={label} onPress={() => setOpen(true)} />
      <MenuSheet
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        items={items}
        onRun={onRun}
      />
    </>
  );
}

function ContextMenu({ label, items, children, form, onRun }: ContextMenuProps & FormProps) {
  const [open, setOpen] = useState(false);
  if (form === 'anchored')
    return (
      <AnchoredContext label={label} items={items} onRun={onRun}>
        {children}
      </AnchoredContext>
    );
  return (
    <>
      <MenuHold onOpen={() => setOpen(true)}>{children}</MenuHold>
      <MenuSheet
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        items={items}
        onRun={onRun}
      />
    </>
  );
}

function useMenuForm(): MenuForm {
  const { navigation } = useWindowLayout();
  return menuForm({ navigation, finePointer: hasFinePointer() });
}

export function Menu(props: MenuProps) {
  const form = useMenuForm();
  const { run, confirm } = useMenuRun();
  return (
    <>
      {'context' in props ? (
        <ContextMenu {...props} form={form} onRun={run} />
      ) : (
        <ButtonMenu {...props} form={form} onRun={run} />
      )}
      {confirm}
    </>
  );
}
