import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Command,
  CommandPalette,
  CommandPanel,
  useCommand,
  useCommandHotkey,
  usePaletteHeight,
  type CommandGroup,
  type CommandView,
} from '@/shared/ui/command';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

const ACTIONS: readonly CommandGroup[] = [
  {
    title: copy.actionsGroup,
    items: [
      {
        id: 'new',
        label: copy.newPayReminder,
        icon: 'plus',
        ink: 'accent',
        shortcut: copy.keyNew,
        onRun: noop,
      },
      { id: 'night', label: copy.nightMode, icon: 'moon', shortcut: copy.keyNight, onRun: noop },
    ],
  },
];

const RESULTS: readonly CommandGroup[] = [
  {
    title: copy.agendaGroup,
    items: [
      {
        id: 'light',
        label: copy.light,
        meta: copy.todayAt,
        icon: 'cal',
        ink: 'agenda',
        onRun: noop,
      },
      {
        id: 'water',
        label: copy.payWater,
        meta: copy.tomorrow,
        icon: 'cal',
        ink: 'agenda',
        onRun: noop,
      },
    ],
  },
];

const VIEW: CommandView = { actions: ACTIONS, results: RESULTS };

const source = () => VIEW;

function StaticPalette() {
  const state = useCommand({ source, onAsk: noop, onClose: noop, initialQuery: copy.payQuery });
  const room = usePaletteHeight();
  return (
    <CommandPalette>
      <CommandPanel state={state} hints room={room} />
    </CommandPalette>
  );
}

function LivePalette() {
  const [open, setOpen] = useState(false);
  useCommandHotkey(() => setOpen(true));
  return (
    <>
      <Button compact label={copy.openCommand} onPress={() => setOpen(true)} />
      <Command open={open} onClose={() => setOpen(false)} source={source} onAsk={noop} />
    </>
  );
}

export function CommandDemo() {
  return (
    <>
      <LabCase id="palette" block>
        <StaticPalette />
      </LabCase>
      <LabCase id="live">
        <LivePalette />
      </LabCase>
    </>
  );
}
