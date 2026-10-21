import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Confirm, ConfirmBox } from '@/shared/ui/confirm';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function ConfirmDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LabCase id="destructive" block>
        <ConfirmBox
          title={copy.sirenTitle}
          body={copy.sirenBody}
          confirmLabel={copy.sirenAct}
          cancelLabel={copy.cancel}
          destructive
          onConfirm={noop}
          onCancel={noop}
        />
      </LabCase>
      <LabCase id="default" block>
        <ConfirmBox
          title={copy.signOutTitle}
          body={copy.signOutBody}
          confirmLabel={copy.signOutAct}
          cancelLabel={copy.cancel}
          destructive={false}
          onConfirm={noop}
          onCancel={noop}
        />
      </LabCase>
      <LabCase id="live">
        <Button compact label={copy.openConfirm} onPress={() => setOpen(true)} />
        <Confirm
          open={open}
          title={copy.sirenTitle}
          body={copy.sirenBody}
          confirmLabel={copy.sirenAct}
          variant="destructive"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </LabCase>
    </>
  );
}
