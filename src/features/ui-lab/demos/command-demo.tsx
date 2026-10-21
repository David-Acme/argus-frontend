import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Command,
  CommandPalette,
  CommandPanel,
  useCommand,
  useCommandHotkey,
  type CommandGroup,
} from '@/shared/ui/command';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

const NoSheet = () => null;

const GROUPS: readonly CommandGroup[] = [
  {
    title: copy.agendaGroup,
    items: [
      { id: 'light', label: copy.light, meta: copy.todayAt, icon: 'bell', onRun: noop },
      { id: 'water', label: copy.payWater, meta: copy.tomorrow, icon: 'bell', onRun: noop },
    ],
  },
  {
    title: copy.actionsGroup,
    items: [
      { id: 'new', label: copy.newPayReminder, icon: 'plus', shortcut: copy.keyNew, onRun: noop },
      { id: 'night', label: copy.nightMode, icon: 'moon', shortcut: copy.keyNight, onRun: noop },
    ],
  },
];

const source = () => GROUPS;

function StaticPalette() {
  const state = useCommand({ source, onAsk: noop, onClose: noop, initialQuery: copy.payQuery });
  return (
    <CommandPalette>
      <CommandPanel state={state} hints />
    </CommandPalette>
  );
}

function LivePalette() {
  const [open, setOpen] = useState(false);
  useCommandHotkey(() => setOpen(true));
  return (
    <>
      <Button compact label={copy.openCommand} onPress={() => setOpen(true)} />
      <Command
        open={open}
        onClose={() => setOpen(false)}
        source={source}
        onAsk={noop}
        sheet={NoSheet}
      />
    </>
  );
}

export function CommandDemo() {
  return (
    <>
      <LabCase id="palette">
        <StaticPalette />
      </LabCase>
      <LabCase id="live">
        <LivePalette />
      </LabCase>
    </>
  );
}
