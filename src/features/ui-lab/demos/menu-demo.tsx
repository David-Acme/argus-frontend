import { Avatar } from '@/shared/ui/avatar';
import { Menu, MenuPreview } from '@/shared/ui/menu';
import type { MenuItems } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

const ITEMS: MenuItems = [
  { label: copy.markDone, icon: 'check', family: 'state', onPress: noop },
  { label: copy.snooze, icon: 'clock', family: 'caution', onPress: noop },
  { label: copy.edit, icon: 'pencil', family: 'edit', onPress: noop },
  { label: copy.share, icon: 'share', family: 'share', onPress: noop },
  {
    label: copy.erase,
    icon: 'trash',
    destructive: true,
    confirm: { title: copy.eraseTitle, body: copy.eraseBody, confirmLabel: copy.erase },
    onPress: noop,
  },
];

export function MenuDemo() {
  return (
    <>
      <LabCase id="panel">
        <MenuPreview items={ITEMS} />
      </LabCase>
      <LabCase id="dropdown">
        <Menu label={copy.reminderOptions} items={ITEMS} />
      </LabCase>
      <LabCase id="context" block>
        <Menu context label={copy.reminderOptions} items={ITEMS}>
          <Row
            leading={<Avatar icon="bell" />}
            title={copy.light}
            meta={copy.lightMeta}
            onPress={noop}
          />
        </Menu>
      </LabCase>
    </>
  );
}
