import { Button } from '@/shared/ui/button';
import { LabCase } from '@/features/ui-lab/components/lab-case';
import { copy } from '@/features/ui-lab/demos/demo-copy';

const noop = () => undefined;

const pending = () => new Promise<void>(() => undefined);

export function ButtonDemo() {
  return (
    <>
      <LabCase id="primary-block" block>
        <Button variant="primary" block label={copy.start} onPress={noop} />
      </LabCase>
      <LabCase id="ghost-block" block>
        <Button variant="ghost" block label={copy.invitation} onPress={noop} />
      </LabCase>
      <LabCase id="primary-icon-block" block>
        <Button variant="primary" block icon="plus" label={copy.newReminder} onPress={noop} />
      </LabCase>
      <LabCase id="primary-compact">
        <Button variant="primary" compact label={copy.activate} onPress={noop} />
      </LabCase>
      <LabCase id="secondary-compact">
        <Button compact label={copy.retry} onPress={noop} />
      </LabCase>
      <LabCase id="secondary-icon-compact">
        <Button compact icon="bell" label={copy.breadReminder} onPress={noop} />
      </LabCase>
      <LabCase id="ghost-compact">
        <Button variant="ghost" compact label={copy.falseAlarm} onPress={noop} />
      </LabCase>
      <LabCase id="danger-compact">
        <Button variant="danger" compact label={copy.sos} onPress={noop} />
      </LabCase>
      <LabCase id="danger-hold">
        <Button compact label={copy.sos} hold={{ onHold: noop, hint: copy.sos }} onPress={noop} />
      </LabCase>
      <LabCase id="glass-compact">
        <Button glass compact trailing={{ icon: 'chevd' }} label={copy.home} onPress={noop} />
      </LabCase>
      <LabCase id="icon-glass">
        <Button iconOnly glass icon="search" iconSize="small" label={copy.search} onPress={noop} />
      </LabCase>
      <LabCase id="icon-filled">
        <Button iconOnly filled icon="plus" label={copy.add} onPress={noop} />
      </LabCase>
      <LabCase id="icon-fab">
        <Button iconOnly fab icon="plus" label={copy.add} onPress={noop} />
      </LabCase>
      <LabCase id="icon-plain">
        <Button iconOnly icon="more" label={copy.more} onPress={noop} />
      </LabCase>
      <LabCase id="icon-back">
        <Button iconOnly glass icon="back" label={copy.back} onPress={noop} />
      </LabCase>
      <LabCase id="disabled">
        <Button variant="primary" disabled label={copy.disabled} onPress={noop} />
      </LabCase>
      <LabCase id="busy">
        <Button variant="primary" busy label={copy.busy} onPress={pending} />
      </LabCase>
    </>
  );
}
