import { Avatar } from '@/shared/ui/avatar';
import { Menu, MenuPreview, type MenuItems } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

const NoSheet = () => null;

const ITEMS: MenuItems = [
  { label: copy.markDone, icon: 'check', onPress: noop },
  { label: copy.snooze, icon: 'clock', onPress: noop },
  { label: copy.erase, icon: 'x', destructive: true, onPress: noop },
];

export function MenuDemo() {
  return (
    <>
      <LabCase id="panel">
        <MenuPreview items={ITEMS} />
      </LabCase>
      <LabCase id="dropdown">
        <Menu label={copy.reminderOptions} items={ITEMS} sheet={NoSheet} />
      </LabCase>
      <LabCase id="context" block>
        <Menu context label={copy.reminderOptions} items={ITEMS} sheet={NoSheet}>
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
